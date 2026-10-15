/**
 * @fileoverview Worker de pipeline: ajustes + filtros + bg-removal fuera del hilo principal.
 * @description Recibe ImageData transferible + params, devuelve ImageData procesado.
 *  Misma matemática que js/main.js (brillo/contraste/saturación, grises/sepia/
 *  invertir, flood-fill desde bordes o global). Sin DOM ni dependencias.
 * @version 1.0.0
 * @license MIT
 */
'use strict';

function getContrastFactor(sliderValue) {
    var mapped = (sliderValue - 100) * 2.55;
    return (259 * (mapped + 255)) / (255 * (259 - mapped));
}

function isColorSimilar(t, r, g, b, tol2) {
    var dr = t.r - r, dg = t.g - g, db = t.b - b;
    return (dr * dr + dg * dg + db * db) <= tol2;
}

function removeBackgroundFromEdges(data, width, height, target, tol2) {
    var visited = new Uint8Array(width * height);
    var qx = [], qy = [];
    function queueIfMatch(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        var vi = y * width + x;
        if (visited[vi]) return;
        var pi = vi * 4;
        if (isColorSimilar(target, data[pi], data[pi + 1], data[pi + 2], tol2)) {
            visited[vi] = 1;
            qx.push(x); qy.push(y);
        }
    }
    var x, y;
    for (x = 0; x < width; x++) { queueIfMatch(x, 0); queueIfMatch(x, height - 1); }
    for (y = 1; y < height - 1; y++) { queueIfMatch(0, y); queueIfMatch(width - 1, y); }
    var head = 0;
    while (head < qx.length) {
        x = qx[head]; y = qy[head]; head++;
        data[(y * width + x) * 4 + 3] = 0;
        queueIfMatch(x, y - 1); queueIfMatch(x, y + 1);
        queueIfMatch(x - 1, y); queueIfMatch(x + 1, y);
    }
}

self.onmessage = function (e) {
    var msg = e.data || {};
    try {
        var width = msg.width, height = msg.height;
        // data puede venir como ArrayBuffer transferido o Uint8ClampedArray
        var data = msg.data instanceof Uint8ClampedArray
            ? msg.data
            : new Uint8ClampedArray(msg.data);
        var p = msg.params || {};
        var brightness = (p.brightness == null ? 100 : p.brightness) / 100;
        var contrastFactor = getContrastFactor(p.contrast == null ? 100 : p.contrast);
        var saturation = (p.saturation == null ? 100 : p.saturation) / 100;
        var filter = p.filter || 'none';

        for (var i = 0; i < data.length; i += 4) {
            var r = data[i], g = data[i + 1], b = data[i + 2];
            r *= brightness; g *= brightness; b *= brightness;
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;
            var gray = 0.2989 * r + 0.587 * g + 0.114 * b;
            r = gray + saturation * (r - gray);
            g = gray + saturation * (g - gray);
            b = gray + saturation * (b - gray);
            r = r < 0 ? 0 : (r > 255 ? 255 : r);
            g = g < 0 ? 0 : (g > 255 ? 255 : g);
            b = b < 0 ? 0 : (b > 255 ? 255 : b);
            if (filter === 'grayscale') {
                var avg = (r + g + b) / 3;
                r = g = b = avg;
            } else if (filter === 'sepia') {
                var nr = r * 0.393 + g * 0.769 + b * 0.189;
                var ng = r * 0.349 + g * 0.686 + b * 0.168;
                var nb = r * 0.272 + g * 0.534 + b * 0.131;
                r = nr > 255 ? 255 : nr; g = ng > 255 ? 255 : ng; b = nb > 255 ? 255 : nb;
            } else if (filter === 'invert') {
                r = 255 - r; g = 255 - g; b = 255 - b;
            }
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
        }

        var hasAlpha = false;
        if (p.bgEnabled) {
            var tol2 = Math.pow((p.tolerance || 0) * 2.55, 2);
            var target = p.bgColor || { r: 255, g: 255, b: 255 };
            if (p.edgesOnly) {
                removeBackgroundFromEdges(data, width, height, target, tol2);
                for (var a = 3; a < data.length; a += 4) {
                    if (data[a] === 0) { hasAlpha = true; break; }
                }
            } else {
                for (var j = 0; j < data.length; j += 4) {
                    if (isColorSimilar(target, data[j], data[j + 1], data[j + 2], tol2)) {
                        data[j + 3] = 0;
                        hasAlpha = true;
                    }
                }
            }
        }

        self.postMessage(
            { id: msg.id, ok: true, width: width, height: height, hasAlpha: hasAlpha, data: data.buffer },
            [data.buffer]
        );
    } catch (err) {
        self.postMessage({ id: (e.data || {}).id, ok: false, error: String((err && err.message) || err) });
    }
};
