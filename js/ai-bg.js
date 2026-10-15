/**
 * @fileoverview Fondo IA local: matting on-device con Transformers.js v3.
 * @description Script clásico que expone `window.AIBackground`. Carga perezosa
 *  (lazy) del runtime solo al primer uso — no penaliza la carga inicial ni
 *  rompe zero-build. Sigue el ejemplo oficial `remove-background-webgpu`:
 *  AutoModel + AutoProcessor directos (sin pipeline, sin dependencia de
 *  mapeos model_type), device WebGPU con fallback a WASM.
 *  Modelos:
 *  - `Xenova/modnet` (Apache-2.0, ~26MB, personas/mascotas, rapidísimo)
 *  - `briaai/RMBG-1.4` (~45-176MB, SOLO uso no-comercial, objetos generales)
 *  Todo corre en local: ninguna imagen sale del dispositivo.
 * @version 2.0.0
 * @license MIT
 */
(function () {
    'use strict';

    var TRANSFORMERS_ESM = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/+esm';

    var MODELS = {
        modnet: { id: 'Xenova/modnet', label: 'MODNet · rápido (26MB)', license: 'Apache-2.0' },
        rmbg: { id: 'briaai/RMBG-1.4', label: 'RMBG-1.4 · general*', license: 'No-comercial' }
    };

    var state = {
        loadingPromise: null,
        runtime: null, // namespace del módulo Transformers.js v3
        sessions: {}, // modelKey -> { model, processor, device }
        currentModel: 'modnet',
        lastProvider: 'desconocido'
    };

    /**
     * Carga perezosa del runtime IA vía import() dinámico (solo al primer uso).
     * @returns {Promise<Object>} namespace con AutoModel/AutoProcessor/RawImage/env
     */
    function loadRuntime() {
        if (!state.loadingPromise) {
            state.loadingPromise = import(TRANSFORMERS_ESM).then(function (mod) {
                var tr = mod;
                // Interop +esm: los exports pueden venir en `default`
                if ((!tr || !tr.AutoModel) && mod && mod.default && mod.default.AutoModel) {
                    tr = mod.default;
                }
                if (!tr || !tr.AutoModel || !tr.AutoProcessor || !tr.RawImage) {
                    throw new Error('Runtime IA incompatible tras cargar CDN.');
                }
                try {
                    // Como en el ejemplo oficial: sin proxy WASM (iGPU local directa)
                    if (tr.env && tr.env.backends && tr.env.backends.onnx && tr.env.backends.onnx.wasm) {
                        tr.env.backends.onnx.wasm.proxy = false;
                    }
                } catch (e) { /* builds sin flag: ignorar */ }
                state.runtime = tr;
                return tr;
            }).catch(function (err) {
                state.loadingPromise = null; // permitir reintento tras fallo de red
                throw err;
            });
        }
        return state.loadingPromise;
    }

    function getProviderHint() {
        try {
            if (window.GPUEngine && window.GPUEngine.getBackend() === 'webgpu') return 'webgpu';
        } catch (e) { /* ignorar */ }
        return 'wasm';
    }

    /**
     * @param {Object} tr Runtime Transformers.js
     * @param {string} modelId Repo de Hugging Face
     * @param {string} device 'webgpu' | 'wasm'
     * @param {(stage:string, pct:number)=>void} [onProgress]
     */
    function loadSession(tr, modelId, device, onProgress) {
        var proxy = function (info) {
            if (onProgress && info && typeof info.progress === 'number') {
                onProgress('descargando-modelo', Math.round(info.progress));
            }
        };
        return Promise.resolve()
            .then(function () {
                return tr.AutoModel.from_pretrained(modelId, {
                    device: device,
                    progress_callback: proxy
                });
            })
            .then(function (model) {
                return tr.AutoProcessor.from_pretrained(modelId).then(function (processor) {
                    return { model: model, processor: processor, device: device };
                });
            });
    }

    /**
     * Sesión (modelo+procesador) con fallback de device: primero el preferido
     * (WebGPU si hay), si falla se reintenta con el otro. Cache por modelo.
     * @param {string} modelKey Clave de MODELS
     * @param {(stage:string, pct:number)=>void} [onProgress]
     * @returns {Promise<{model, processor, device}>}
     */
    function getSession(modelKey, onProgress) {
        modelKey = MODELS[modelKey] ? modelKey : 'modnet';
        if (state.sessions[modelKey]) return Promise.resolve(state.sessions[modelKey]);
        return loadRuntime().then(function (tr) {
            var first = getProviderHint();
            var second = first === 'webgpu' ? 'wasm' : 'webgpu';
            if (onProgress) onProgress('descargando-modelo', 5);
            return loadSession(tr, MODELS[modelKey].id, first, onProgress).catch(function (err1) {
                if (String((err1 && err1.message) || '').indexOf('TIMEOUT') === 0) throw err1;
                // Reintentar con el otro device (ej: WebGPU OOM → WASM)
                if (onProgress) onProgress('descargando-modelo', 5);
                return loadSession(tr, MODELS[modelKey].id, second, onProgress);
            }).then(function (sess) {
                sess.runtime = tr;
                state.sessions[modelKey] = sess;
                state.lastProvider = sess.device;
                if (onProgress) onProgress('listo', 100);
                return sess;
            });
        });
    }

    /**
     * Aplica el modelo a un canvas y devuelve canvas RGBA con alfa.
     * @param {HTMLCanvasElement} sourceCanvas Recorte ya procesado (con filtros)
     * @param {{model?:string, maxSide?:number, onProgress?:Function}} [opts]
     * @returns {Promise<HTMLCanvasElement>}
     */
    function removeBackground(sourceCanvas, opts) {
        opts = opts || {};
        var modelKey = opts.model || state.currentModel;
        var maxSide = opts.maxSide || 1024; // Vega 8 2GB: cap para no OOM
        var scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
        var inferCanvas = sourceCanvas;
        if (scale < 1) {
            inferCanvas = document.createElement('canvas');
            inferCanvas.width = Math.round(sourceCanvas.width * scale);
            inferCanvas.height = Math.round(sourceCanvas.height * scale);
            inferCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0, inferCanvas.width, inferCanvas.height);
        }
        return getSession(modelKey, opts.onProgress).then(function (sess) {
            var tr = sess.runtime;
            if (opts.onProgress) opts.onProgress('inferencia', 50);
            // Nota: fromCanvas/fromTensor/resize son síncronos en v3 (sin .then);
            // Promise.resolve() normaliza por si cambian a async en v4.
            return Promise.resolve(tr.RawImage.fromCanvas(inferCanvas)).then(function (img) {
                return sess.processor(img).then(function (inputs) {
                    // MODNet espera la entrada `input` (ver ejemplo oficial
                    // remove-background-webgpu); el procesador devuelve `pixel_values`.
                    var feed = { input: inputs.pixel_values || inputs.input || inputs };
                    return sess.model(feed).then(function (result) {
                        var output = result.output || result.logits;
                        if (!output) throw new Error('El modelo no devolvió máscara.');
                        return Promise.resolve(tr.RawImage.fromTensor(output[0].mul(255).to('uint8'))).then(function (t) {
                            return Promise.resolve(t.resize(img.width, img.height)).then(function (mask) {
                                if (opts.onProgress) opts.onProgress('listo', 100);
                                return maskToAlphaCanvas(mask, sourceCanvas);
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * Convierte la máscara gris (RawImage) en canvas RGBA del tamaño fuente:
     * RGB original a resolución completa + alfa de la máscara reescalado.
     * @param {{data:Uint8Array, width:number, height:number}} mask
     * @param {HTMLCanvasElement} sourceCanvas
     * @returns {HTMLCanvasElement}
     */
    function maskToAlphaCanvas(mask, sourceCanvas) {
        var mw = mask.width, mh = mask.height, mdata = mask.data;
        var channels = Math.round(mdata.length / (mw * mh)) || 1;
        // Alfa al tamaño nativo de la máscara
        var a = document.createElement('canvas');
        a.width = mw; a.height = mh;
        var actx = a.getContext('2d');
        var aid = actx.createImageData(mw, mh);
        for (var p = 0, i = 0; p < mw * mh; p++, i += 4) {
            // 1 canal: valor directo; 3/4 canales: canal R (R=G=B en máscara gris)
            aid.data[i] = 255; aid.data[i + 1] = 255; aid.data[i + 2] = 255;
            aid.data[i + 3] = channels === 1 ? mdata[p] : mdata[p * channels];
        }
        actx.putImageData(aid, 0, 0);
        // Componer a tamaño fuente: RGB intacto, solo el alfa se reescala
        var out = document.createElement('canvas');
        out.width = sourceCanvas.width;
        out.height = sourceCanvas.height;
        var octx = out.getContext('2d');
        octx.drawImage(sourceCanvas, 0, 0);
        octx.globalCompositeOperation = 'destination-in';
        octx.drawImage(a, 0, 0, out.width, out.height);
        octx.globalCompositeOperation = 'source-over';
        return out;
    }

    function setModel(key) {
        if (MODELS[key]) state.currentModel = key;
        return state.currentModel;
    }

    window.AIBackground = {
        MODELS: MODELS,
        getModel: function () { return state.currentModel; },
        setModel: setModel,
        getProvider: function () { return state.lastProvider; },
        isCached: function (k) { return !!state.sessions[k || state.currentModel]; },
        warmup: function (k, cb) {
            return getSession(k || state.currentModel, cb).then(function (s) { return s.model; });
        },
        removeBackground: removeBackground
    };
})();
