## Propósito

Guía concisa para agentes IA que trabajan en este repositorio: un editor de imágenes web (HTML/CSS/Vanilla JS) que usa Cropper.js, Compressor.js y FileSaver.js desde CDN.

## Archivo(s) clave

- `index.html` — entrada principal; incluye las librerías vía CDN y carga `js/main.js`.
- `js/main.js` — lógica única y monolítica: carga de archivos, inicialización de Cropper, previsualización, filtros, eliminación de fondo y descarga. **Funciones documentadas con JSDoc.**
- `css/style.css` — estilos globales; sigue layout basado en `.container`, `.editor-container`, `.image-container` y `.controls`. **Secciones organizadas con comentarios.**
- `README.md` — guía completa de usuario con arquitectura, API, troubleshooting y contribución.
- `ARCHITECTURE.md` — arquitectura técnica detallada, flujos de datos, patrones de diseño y decisiones.
- `API.md` — referencia completa de funciones con parámetros, retornos y ejemplos.
- `CONTRIBUTING.md` — guía para contribuidores: convenciones, testing, proceso de PR.
- `CHANGELOG.md` — registro de cambios y versiones.

## Arquitectura y flujo de datos (big picture)

1. Usuario sube imagen (`fileInput` / `dropZone`) → `handleFileSelect(file)` en `js/main.js`.
2. `Cropper` se inicializa sobre `#imagePreview`. Cambios en recorte disparan `applyTransformations()`.
3. `applyTransformations()` crea un canvas temporal, aplica:
   - Contraste (factor matemático)
   - Filtros (grayscale/sepia mediante conversión RGB)
   - **Eliminación de fondo** (Flood Fill BFS desde bordes O algoritmo global legacy)
4. Preview se renderiza en `#maskPreview` superpuesto sobre la imagen.
5. `processAndDownload()` construye el canvas final, reaplicando todas las transformaciones, comprime con `Compressor` y descarga con `FileSaver`.

## Convenciones específicas del proyecto

### JavaScript
- **Vanilla JS global**: No hay bundler ni módulos ES6. Código en closure de `DOMContentLoaded`.
- **Nomenclatura**: camelCase para variables/funciones, IDs en HTML.
- **JSDoc**: Todas las funciones principales documentadas con `@param`, `@returns`, `@example`, `@algorithm`.
- **Selectores DOM**: Basados en IDs (ej.: `imagePreview`, `quality`, `format`, `downloadBtn`).
- **Estado global**: Variables como `cropper`, `currentFile`, `originalImage`, `currentFilter` en scope del módulo.

### CSS
- **Organización**: Secciones con headers ASCII (`/* === SECTION === */`).
- **Nomenclatura**: kebab-case para clases, BEM-like cuando es apropiado.
- **Responsive**: Media query @ 768px para mobile (flexbox → columna).

### HTML
- **IDs para JS, clases para CSS**: `<button id="downloadBtn" class="btn">`.
- **Orden de atributos**: id, class, data-*, otros.

## Eliminación de Fondo (Feature Clave)

**Algoritmo principal: Flood Fill desde bordes (v1.1.0)**
- Función: `removeBackgroundFromEdges(imageData, targetColor, tolerancePercent)`
- Algoritmo: BFS que solo elimina píxeles del fondo conectados a los bordes
- **Ventaja**: Preserva elementos internos con colores similares (ej: camisa blanca en fondo blanco)
- Checkbox UI: `#edgesOnly` (checked por defecto)
- **Legacy fallback**: Algoritmo global (compara todos los píxeles) si checkbox desmarcado

**Cómo funciona:**
1. Escanear todos los píxeles del perímetro de la imagen
2. Si píxel del borde coincide con `targetColor` (usando `isColorSimilar()`): agregar a cola BFS
3. BFS: Expandir desde bordes, marcar píxeles como transparentes (alpha = 0)
4. Solo píxeles conectados al borde son removidos

**Limitación**: Si el sujeto toca los bordes, puede ser afectado.

## Dependencias e integración

- **Cropper.js v1.5.12**: Recorte interactivo, métodos clave: `getCroppedCanvas()`, `getData()`, `destroy()`
- **Compressor.js v1.1.1**: Compresión en cliente, parámetros: `quality`, `mimeType`
- **FileSaver.js v2.0.5**: Descarga de blobs, método: `saveAs(blob, filename)`
- **CDN**: Librerías cargadas desde CDN. Para uso offline, descargar localmente.
- **No hay backend**: Todo procesamiento en cliente (Canvas API).

## Cómo abordar cambios comunes

### Agregar un nuevo filtro
1. **HTML**: Agregar botón en `.filter-controls` con ID único
   ```html
   <button id="filterInvert" class="filter-btn">Invertir</button>
   ```
2. **JS - Event Listener**: Registrar en `main.js`
   ```javascript
   document.getElementById('filterInvert').addEventListener('click', () => 
       setActiveFilter('invert')
   );
   ```
3. **JS - Lógica en `applyTransformations()`**: Agregar caso en el switch de filtros
   ```javascript
   if (currentFilter === 'invert') {
       for (let i = 0; i < data.length; i += 4) {
           data[i]   = 255 - data[i];   // Red
           data[i+1] = 255 - data[i+1]; // Green
           data[i+2] = 255 - data[i+2]; // Blue
       }
   }
   ```
4. **JS - Duplicar en `processAndDownload()`**: Aplicar mismo código para descarga final
5. **Documentación**: Actualizar `README.md` en sección de Características

### Agregar un control de slider
```html
<!-- HTML -->
<div class="control-group">
    <label for="brightness">Brillo:</label>
    <input type="range" id="brightness" min="0" max="200" value="100">
    <span id="brightnessValue">100%</span>
</div>
```
```javascript
// JavaScript
const brightnessSlider = document.getElementById('brightness');
brightnessSlider.addEventListener('input', () => {
    document.getElementById('brightnessValue').textContent = `${brightnessSlider.value}%`;
    applyTransformations();
});
```

### Optimizar rendimiento
- **Web Workers**: Mover procesamiento pesado fuera del main thread (ver `CONTRIBUTING.md`)
- **Throttling**: Debounce en sliders (100ms delay con `setTimeout`)
- **WebGL**: Para filtros complejos (blur, sharpen), considerar shaders

## Debugging y flujo de desarrollo

### Ejecutar localmente
```powershell
# Opción 1: Abrir directamente (sin servidor)
start index.html

# Opción 2: Servidor HTTP (recomendado)
python -m http.server 8000
# O: npx http-server -p 8000
# Luego: http://localhost:8000
```

### Puntos de interrupción clave
- `handleFileSelect()` — Validación y carga de archivo
- `applyTransformations()` — Procesamiento de efectos en preview
- `processAndDownload()` — Pipeline de descarga final
- `removeBackgroundFromEdges()` — Algoritmo de Flood Fill

### Verificar en consola
```javascript
console.log('Dimensiones:', originalWidth, originalHeight);
console.log('Crop data:', cropper.getData());
console.log('Filter activo:', currentFilter);
```

## Restricciones y notas importantes

- **No hay test suite ni CI**: Testing manual requerido (ver `CONTRIBUTING.md` para checklist)
- **Límite de archivo**: 10 MB (configurado en `handleFileSelect`)
- **Procesamiento síncrono**: Bloquea main thread, considerar imágenes > 4000x4000 pueden causar lag
- **Formato auto-forzado**: PNG si hay transparencia (ver `processAndDownload`)
- **IDs públicos**: Cambios en IDs requieren actualizar HTML y JS conjuntamente
- **Compatibilidad**: Probar en Chrome, Firefox, Safari, Edge

## Documentación completa

Para información detallada, consultar:
- **`README.md`** — Guía completa de usuario, arquitectura, troubleshooting
- **`ARCHITECTURE.md`** — Patrones de diseño, decisiones técnicas, métricas
- **`API.md`** — Referencia de funciones con ejemplos y casos de uso
- **`CONTRIBUTING.md`** — Convenciones de código, testing, proceso de PR
- **`CHANGELOG.md`** — Historia de cambios y versiones

## Convenciones de commits (recomendadas)

```
feat(filtros): agregar filtro de inversión de colores
fix(crop): corregir posicionamiento de maskCanvas en zoom
docs(api): documentar función removeBackgroundFromEdges
refactor(main): extraer lógica de filtros a funciones separadas
perf(canvas): optimizar procesamiento con Web Workers
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`

## Mejoras futuras priorizadas

Ver `README.md` sección "Posibles Mejoras Futuras" para roadmap completo.

**Prioridad Alta:**
- Historial deshacer/rehacer
- Rotación y volteo de imagen
- Más filtros (brillo, saturación, blur)
- Web Workers para procesamiento asíncrono

**Notas para agentes IA:** Este proyecto está completamente documentado. Antes de hacer cambios, leer `ARCHITECTURE.md` para entender el flujo de datos y `API.md` para la referencia de funciones.
