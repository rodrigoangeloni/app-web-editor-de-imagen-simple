/**
 * @fileoverview Motor GPU unificado: detección WebGPU/WebGL2 + filtros acelerados.
 * @description Script clásico (sin módulos) que expone `window.GPUEngine`.
 *  Estrategia: WebGPU primero (async, ideal export), WebGL2 sync (preview
 *  en tiempo real), CPU como fallback. La etapa de color (brillo/contraste/
 *  saturación + filtro) corre en GPU; bg-removal sigue en CPU/Worker.
 *  Zero-build: sin dependencias, funciona con `file://` (solo desactiva WebGPU
 *  si no hay contexto seguro).
 * @version 1.0.0
 * @license MIT
 */
(function () {
    'use strict';

    /** Mapeo filtro -> entero para uniforms */
    var FILTER_TO_INT = { none: 0, grayscale: 1, sepia: 2, invert: 3 };

    var state = {
        backend: 'cpu', // 'webgpu' | 'webgl2' | 'cpu'
        webgpuDevice: null,
        webgpuAdapterInfo: '',
        webgl: null, // { canvas, gl, program, locs, texture }
        webgpuFailed: false,
        webglFailed: false,
        initialized: false
    };

    var VERT_SRC = (
        '#version 300 es\n' +
        'in vec2 aPos;\n' +
        'out vec2 vUV;\n' +
        'void main(){ vUV = vec2(aPos.x*0.5+0.5, 0.5-aPos.y*0.5); gl_Position = vec4(aPos,0.0,1.0); }'
    );

    var FRAG_SRC = (
        '#version 300 es\n' +
        'precision highp float;\n' +
        'uniform sampler2D uTex;\n' +
        'uniform float uBrightness;\n' +
        'uniform float uContrast;\n' +
        'uniform float uSaturation;\n' +
        'uniform int uFilter;\n' +
        'in vec2 vUV;\n' +
        'out vec4 outColor;\n' +
        'void main(){\n' +
        '  vec3 c = texture(uTex, vUV).rgb;\n' +
        '  c *= uBrightness;\n' +
        '  c = uContrast * (c - vec3(0.50196)) + vec3(0.50196);\n' +
        '  float gray = dot(c, vec3(0.2989, 0.5870, 0.1140));\n' +
        '  c = mix(vec3(gray), c, uSaturation);\n' +
        '  c = clamp(c, 0.0, 1.0);\n' +
        '  if (uFilter == 1) { float a = (c.r + c.g + c.b) / 3.0; c = vec3(a); }\n' +
        '  else if (uFilter == 2) {\n' +
        '    c = clamp(vec3(\n' +
        '      c.r*0.393 + c.g*0.769 + c.b*0.189,\n' +
        '      c.r*0.349 + c.g*0.686 + c.b*0.168,\n' +
        '      c.r*0.272 + c.g*0.534 + c.b*0.131), 0.0, 1.0);\n' +
        '  } else if (uFilter == 3) { c = 1.0 - c; }\n' +
        '  outColor = vec4(c, 1.0);\n' +
        '}'
    );

    var WGSL_SRC = (
        'struct Params { brightness: f32, contrast: f32, saturation: f32, filterMode: u32 };\n' +
        '@group(0) @binding(0) var inputTex: texture_2d<f32>;\n' +
        '@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;\n' +
        '@group(0) @binding(2) var<uniform> p: Params;\n' +
        '@compute @workgroup_size(16, 16)\n' +
        'fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n' +
        '  let dims = textureDimensions(inputTex);\n' +
        '  if (gid.x >= dims.x || gid.y >= dims.y) { return; }\n' +
        '  var c = textureLoad(inputTex, vec2<i32>(gid.xy), 0).rgb;\n' +
        '  c = c * p.brightness;\n' +
        '  c = p.contrast * (c - vec3<f32>(0.50196)) + vec3<f32>(0.50196);\n' +
        '  let g = dot(c, vec3<f32>(0.2989, 0.5870, 0.1140));\n' +
        '  c = mix(vec3<f32>(g), c, p.saturation);\n' +
        '  c = clamp(c, vec3<f32>(0.0), vec3<f32>(1.0));\n' +
        '  if (p.filterMode == 1u) { let a = (c.r + c.g + c.b) / 3.0; c = vec3<f32>(a); }\n' +
        '  else if (p.filterMode == 2u) {\n' +
        '    c = clamp(vec3<f32>(\n' +
        '      c.r*0.393 + c.g*0.769 + c.b*0.189,\n' +
        '      c.r*0.349 + c.g*0.686 + c.b*0.168,\n' +
        '      c.r*0.272 + c.g*0.534 + c.b*0.131), vec3<f32>(0.0), vec3<f32>(1.0));\n' +
        '  } else if (p.filterMode == 3u) { c = vec3<f32>(1.0) - c; }\n' +
        '  textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(c, 1.0));\n' +
        '}'
    );

    function contrastToGL(sliderValue) {
        // Misma fórmula que getContrastFactor en main.js, normalizada a 0..1
        var mapped = (sliderValue - 100) * 2.55;
        return (259 * (mapped + 255)) / (255 * (259 - mapped));
    }

    function compileShader(gl, type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            throw new Error('GLSL: ' + gl.getShaderInfoLog(s));
        }
        return s;
    }

    function initWebGL2() {
        if (state.webgl || state.webglFailed) return !!state.webgl;
        try {
            var canvas = document.createElement('canvas');
            var gl = canvas.getContext('webgl2', {
                antialias: false, depth: false, stencil: false,
                preserveDrawingBuffer: true, powerPreference: 'high-performance'
            });
            if (!gl) { state.webglFailed = true; return false; }
            var vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
            var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
            var prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                throw new Error('link: ' + gl.getProgramInfoLog(prog));
            }
            gl.useProgram(prog);
            // Fullscreen triangle
            var buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
            var loc = gl.getAttribLocation(prog, 'aPos');
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            state.webgl = {
                canvas: canvas, gl: gl, program: prog,
                texture: tex,
                locs: {
                    tex: gl.getUniformLocation(prog, 'uTex'),
                    brightness: gl.getUniformLocation(prog, 'uBrightness'),
                    contrast: gl.getUniformLocation(prog, 'uContrast'),
                    saturation: gl.getUniformLocation(prog, 'uSaturation'),
                    filter: gl.getUniformLocation(prog, 'uFilter')
                }
            };
            return true;
        } catch (err) {
            state.webglFailed = true;
            if (window.console && console.debug) console.debug('[GPU] WebGL2 no disponible:', err);
            return false;
        }
    }

    /**
     * Etapa de color vía WebGL2 (síncrona, ideal para preview 60fps).
     * @param {HTMLCanvasElement} sourceCanvas Canvas ya recortado/redimensionado
     * @param {{brightness:number, contrastSlider:number, saturation:number, filter:string}} params
     * @returns {HTMLCanvasElement|null} Canvas con resultado, o null si falla
     */
    function applyColorGL(sourceCanvas, params) {
        if (!initWebGL2()) return null;
        try {
            var W = state.webgl, gl = W.gl;
            var w = sourceCanvas.width, h = sourceCanvas.height;
            if (!w || !h) return null;
            if (W.canvas.width !== w || W.canvas.height !== h) {
                W.canvas.width = w; W.canvas.height = h;
            }
            gl.viewport(0, 0, w, h);
            gl.useProgram(W.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, W.texture);
            // Nota orientación: vUV ya invierte Y en el vertex shader, así que
            // se sube la textura SIN flip (UNPACK_FLIP_Y=false por defecto).
            // Con flip activado la imagen saldría boca abajo.
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
            gl.uniform1i(W.locs.tex, 0);
            gl.uniform1f(W.locs.brightness, params.brightness);
            gl.uniform1f(W.locs.contrast, contrastToGL(params.contrastSlider));
            gl.uniform1f(W.locs.saturation, params.saturation);
            gl.uniform1i(W.locs.filter, FILTER_TO_INT[params.filter] || 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            return W.canvas;
        } catch (err) {
            state.webglFailed = true;
            if (window.console && console.debug) console.debug('[GPU] applyColorGL falló, fallback CPU:', err);
            return null;
        }
    }

    async function initWebGPU() {
        if (state.webgpuDevice || state.webgpuFailed) return !!state.webgpuDevice;
        try {
            if (!('gpu' in navigator)) return false;
            // Solo contexto seguro (HTTPS/localhost). file:// -> WebGPU bloqueado.
            if (!window.isSecureContext) return false;
            var adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter) return false;
            // Info útil para badge (Vega 8 reporta vendor/architecture según navegador)
            try {
                var info = adapter.info || {};
                state.webgpuAdapterInfo = [info.vendor, info.architecture, info.device].filter(Boolean).join(' ').trim();
            } catch (e) { /* info no disponible en algunos builds */ }
            var device = await adapter.requestDevice();
            device.lost.then(function (info) {
                state.webgpuDevice = null;
                state.webgpuFailed = true;
                if (state.backend === 'webgpu') state.backend = initWebGL2() ? 'webgl2' : 'cpu';
                if (window.console) console.warn('[GPU] device lost:', info && info.message);
            });
            state.webgpuDevice = device;
            return true;
        } catch (err) {
            state.webgpuFailed = true;
            if (window.console && console.debug) console.debug('[GPU] WebGPU no disponible:', err);
            return false;
        }
    }

    /**
     * Etapa de color vía WebGPU compute (async, ideal para export/batch).
     * @param {HTMLCanvasElement|ImageBitmap} source
     * @param {{brightness:number, contrastSlider:number, saturation:number, filter:string}} params
     * @returns {Promise<HTMLCanvasElement|null>}
     */
    async function applyColorWebGPU(source, params) {
        var ok = await initWebGPU();
        if (!ok) return null;
        var device = state.webgpuDevice;
        try {
            var bmp = (source instanceof ImageBitmap) ? source : await createImageBitmap(source);
            var w = bmp.width, h = bmp.height;
            var mustClose = !(source instanceof ImageBitmap);
            var inTex = device.createTexture({
                size: [w, h], format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
            });
            device.queue.copyExternalImageToTexture({ source: bmp }, { texture: inTex }, [w, h]);
            var outTex = device.createTexture({
                size: [w, h], format: 'rgba8unorm',
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
            });
            var module = device.createShaderModule({ code: WGSL_SRC });
            // Falla rápido y ruidoso si el WGSL no compila (evita outputs en negro silenciosos)
            try {
                var ci = await module.getCompilationInfo();
                var errs = (ci.messages || []).filter(function (m) { return m.type === 'error'; });
                if (errs.length) {
                    throw new Error('WGSL: ' + errs.map(function (m) { return m.message; }).join(' | '));
                }
            } catch (e) {
                if (String((e && e.message) || '').indexOf('WGSL:') === 0) throw e;
            }
            var pipeline = device.createComputePipeline({ layout: 'auto', compute: { module: module, entryPoint: 'main' } });
            var uniformBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            var uarr = new ArrayBuffer(16);
            new Float32Array(uarr, 0, 3).set([params.brightness, contrastToGL(params.contrastSlider), params.saturation]);
            new Uint32Array(uarr, 12, 1).set([FILTER_TO_INT[params.filter] || 0]);
            device.queue.writeBuffer(uniformBuf, 0, uarr);
            var bind = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: inTex.createView() },
                    { binding: 1, resource: outTex.createView() },
                    { binding: 2, resource: { buffer: uniformBuf } }
                ]
            });
            var enc = device.createCommandEncoder();
            var pass = enc.beginComputePass();
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bind);
            pass.dispatchWorkgroups(Math.ceil(w / 16), Math.ceil(h / 16));
            pass.end();
            // Readback: output -> buffer -> ImageData
            var bytesPerRow = Math.ceil((w * 4) / 256) * 256;
            var readBuf = device.createBuffer({ size: bytesPerRow * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
            enc.copyTextureToBuffer({ texture: outTex }, { buffer: readBuf, bytesPerRow: bytesPerRow }, [w, h, 1]);
            device.queue.submit([enc.finish()]);
            await readBuf.mapAsync(GPUMapMode.READ);
            var mapped = new Uint8Array(readBuf.getMappedRange()).slice();
            readBuf.unmap();
            var out = document.createElement('canvas');
            out.width = w; out.height = h;
            var ctx = out.getContext('2d');
            var img = ctx.createImageData(w, h);
            for (var y = 0; y < h; y++) {
                img.data.set(mapped.subarray(y * bytesPerRow, y * bytesPerRow + w * 4), y * w * 4);
            }
            ctx.putImageData(img, 0, 0);
            if (mustClose && bmp.close) bmp.close();
            inTex.destroy(); outTex.destroy(); readBuf.destroy(); uniformBuf.destroy();
            return out;
        } catch (err) {
            state.webgpuFailed = true;
            if (window.console && console.debug) console.debug('[GPU] WebGPU falló, fallback:', err);
            return null;
        }
    }

    /**
     * Detección inicial. Prefiere WebGPU, si no WebGL2, si no CPU.
     * No bloquea: WebGPU se confirma async; mientras tanto usa WebGL2 sync.
     * @returns {Promise<string>} backend efectivo
     */
    async function init() {
        if (state.initialized) return state.backend;
        var hasGL = initWebGL2();
        state.backend = hasGL ? 'webgl2' : 'cpu';
        try {
            var gpuOk = await initWebGPU();
            if (gpuOk) state.backend = 'webgpu';
        } catch (e) { /* mantener backend sync */ }
        state.initialized = true;
        return state.backend;
    }

    function getBackend() { return state.backend; }

    function getLabel() {
        if (state.backend === 'webgpu') return 'GPU · WebGPU' + (state.webgpuAdapterInfo ? ' · ' + state.webgpuAdapterInfo : '');
        if (state.backend === 'webgl2') return 'GPU · WebGL2';
        return 'CPU';
    }

    /**
     * Benchmark rápido del backend de color (útil en consola y badge).
     * @param {number} [w=1280] Ancho dummy
     * @param {number} [h=720] Alto dummy
     * @returns {Promise<{backend:string, ms:number}>}
     */
    async function bench(w, h) {
        w = w || 1280; h = h || 720;
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#f43'); g.addColorStop(1, '#34f');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        var params = { brightness: 1.1, contrastSlider: 110, saturation: 1.2, filter: 'sepia' };
        var t0 = performance.now();
        if (state.backend === 'webgpu') {
            await applyColorWebGPU(c, params);
        } else if (state.backend === 'webgl2') {
            applyColorGL(c, params);
        }
        return { backend: state.backend, ms: Math.round((performance.now() - t0) * 10) / 10 };
    }

    window.GPUEngine = {
        init: init,
        getBackend: getBackend,
        getLabel: getLabel,
        applyColorGL: applyColorGL,
        applyColorWebGPU: applyColorWebGPU,
        bench: bench,
        _contrastToGL: contrastToGL
    };
})();
