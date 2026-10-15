# Editor de Imágenes Web - Guía para Agentes IA

Editor de imágenes cliente-side (Vanilla JS + Canvas API) con Cropper.js, Compressor.js y FileSaver.js vía CDN.

## Arquitectura y Flujo de Datos

```
fileInput/dropZone → handleFileSelect(file) → Cropper.js inicializa sobre #imagePreview
    ↓ (cualquier cambio en UI)
debouncedApplyTransformations() → canvas temporal → brillo/contraste/saturación → filtros → bg removal → #maskPreview
    ↓ (click descargar)
processAndDownload() → setLoading() → redimensionar → transformaciones → Compressor.js → FileSaver.js → showToast()
```

**Archivos clave:**
- `js/main.js` — Lógica en closure `DOMContentLoaded`. Estado: `cropper`, `currentFile`, `originalImage`, `currentFilter`, `historyStack`, `scaleX/Y` + IA: `aiMaskEnabled`, `aiMaskCanvas`, `aiMaskForSize`
- `js/gpu.js` — Script clásico que expone `window.GPUEngine`: detección WebGPU > WebGL2 > CPU, `applyColorGL()` (sync, preview), `applyColorWebGPU()` (async, export), `bench()`, badge `#gpuBadge`
- `js/ai-bg.js` — Script clásico que expone `window.AIBackground`: Transformers.js **v3** vía `import()` dinámico (`+esm`), `AutoModel`+`AutoProcessor` directos con device WebGPU y fallback WASM, modelos MODNet (Apache-2.0) y RMBG-1.4 (no-comercial)
- `js/pipeline.worker.js` — Worker sin DOM: misma matemática de color + fondo clásico, buffer transferible, timeout 15 s con fallback CPU
- `index.html` — Librerías CDN, estructura DOM con IDs, atributos ARIA
- `css/style.css` — Secciones con headers `/* === SECTION === */`, responsive @768px

## Estado Global Principal

```javascript
CONFIG = { MAX_FILE_SIZE, DEBOUNCE_DELAY, HISTORY_LIMIT, TOAST_DURATION }
cropper, currentFile, originalImage, currentFilter
scaleX, scaleY (para flip)
historyStack[], historyIndex, isUndoRedo
debounceTimer
```

## Convenciones Críticas

**Etapa de color unificada (no duplicar lógica):**
- `getFilterParams()` en `main.js` es la única fuente de verdad `{brightness, contrastSlider, saturation, filter}` para CPU (`applyColorCPU`), WebGL2 (`GPUEngine.applyColorGL`), WebGPU (`GPUEngine.applyColorWebGPU`) y Worker.
- Preview = WebGL2 sync sobre `#maskPreview` **con damero debajo** (los alfa=0 mostrarían el clon sin procesar de Cropper si no). Export = Worker (≥500×500) → WebGPU → CPU. El export nunca usa el canvas del preview: conserva el alfa real.
- Fondo IA: `handleAiBackground()` genera `aiMaskCanvas` una vez y `applyAiMaskInPlace()` la re-aplica tras cada ajuste; cambiar el recorte la invalida. Va en `saveState`/`restoreState`/`resetControls` como `aiMaskEnabled` (+ `aiModel`).

**Glosario de trampas GPU/IA (verificadas en navegador):**
- WGSL: `filter` es palabra reservada (usar `filterMode`); `gpu.js` verifica `getCompilationInfo()` y cae a CPU con `console.debug`.
- Transformers v2 dist NO es UMD y su `image-segmentation` no registra `modnet` → usar **v3 `+esm` con `import()`** y `AutoModel`/`AutoProcessor` directos; MODNet espera entrada **`{input: pixel_values}`**; `RawImage.fromCanvas` es **síncrono** en v3 (envolver con `Promise.resolve`).
- Canvas WebGL ≠ canvas 2D: para leer píxeles de un canvas WebGL hay que dibujarlo antes en otro canvas 2D.
- `UNPACK_FLIP_Y_WEBGL` debe quedarse en `false` con nuestro vertex shader (si no, sale boca abajo).

**JavaScript:**
- camelCase para variables/funciones, IDs en HTML (`#downloadBtn`, `#imagePreview`)
- JSDoc en funciones principales: `@param`, `@returns`, `@algorithm`
- Sin bundler ni módulos ES6 — todo en scope global del closure
- Usar `debouncedApplyTransformations()` para cambios en sliders
- Llamar `saveState()` después de cada cambio significativo

**HTML/CSS:**
- `id` para JS, `class` para CSS: `<button id="downloadBtn" class="btn">`
- Atributos ARIA en controles interactivos (`aria-label`, `aria-pressed`, `role`)
- CSS: kebab-case, BEM-like cuando apropiado

## Sistemas Implementados

### Toast Notifications
```javascript
showToast('Mensaje', 'success' | 'error' | 'warning' | 'info');
```

### Loading Overlay
```javascript
setLoading(true, 'Procesando...');
// ... operación larga
setLoading(false);
```

### Sistema de Historial (Undo/Redo)
```javascript
saveState();  // Después de cada cambio
undo();       // Ctrl+Z
redo();       // Ctrl+Y
```

### Atajos de Teclado
- `Ctrl+S` — Descargar
- `Ctrl+Z` — Deshacer
- `Ctrl+Y` / `Ctrl+Shift+Z` — Rehacer
- `Escape` — Resetear
- `Ctrl+←/→` — Rotar 90°

## Patrón: Agregar Nuevo Filtro

1. **HTML** (`index.html`): `<button id="filterNew" class="filter-btn" aria-pressed="false">Nuevo</button>`
2. **JS** (`main.js`): Event listener + lógica en AMBAS funciones:
   ```javascript
   // Event listener
   filterNewBtn.addEventListener('click', () => setActiveFilter('new'));
   
   // En applyTransformations() Y processAndDownload() (duplicar lógica)
   if (currentFilter === 'new') {
       for (let i = 0; i < data.length; i += 4) {
           // procesamiento
       }
   }
   
   // En setActiveFilter() - actualizar aria-pressed
   ```

## Patrón: Agregar Nuevo Control con Historial

```javascript
// 1. Agregar DOM ref
const newControl = document.getElementById('newControl');

// 2. Event listener con debounce
newControl.addEventListener('input', () => {
    valueDisplay.textContent = `${newControl.value}%`;
    debouncedApplyTransformations();
});

// 3. Agregar a saveState/restoreState
state.newValue = newControl.value;
// restoreState: newControl.value = state.newValue;

// 4. Agregar a resetControls()
newControl.value = defaultValue;

// 5. Procesar en applyTransformations() y processAndDownload()
```

## Algoritmo Clave: Eliminación de Fondo

`removeBackgroundFromEdges()` usa **Flood Fill BFS desde bordes**:
- Solo elimina píxeles conectados a los bordes de la imagen (preserva elementos internos)
- UI: checkbox `#edgesOnly` (checked por defecto)
- Fallback global si desmarcado (todos los píxeles similares)

## Ejecutar y Debuggear

```powershell
# Servidor local (recomendado)
python -m http.server 8000  # o: npx http-server -p 8000
```

**Breakpoints clave:** `handleFileSelect`, `applyTransformations`, `processAndDownload`, `saveState`

## Restricciones

- **Límite 10MB** en `handleFileSelect()` (configurable en `CONFIG`)
- **PNG forzado** si hay transparencia (`processAndDownload`; cubre fondo clásico + IA; AVIF usa ruta nativa `toBlob` sin Compressor.js)
- **Procesamiento**: preview color en GPU sync (WebGL2) + fondo CPU sync; export pesado en Worker (≥500×500 px, timeout 15 s) o WebGPU async, con fallback CPU. `willReadFrequently: true` en contextos 2D con lecturas repetidas
- **Historial máximo** — 20 estados (configurable en `CONFIG.HISTORY_LIMIT`)
- **Sin tests automatizados** — testing manual requerido (ver `CONTRIBUTING.md`)

## Documentación Detallada

| Archivo | Contenido |
|---------|-----------|
| `ARCHITECTURE.md` | Flujos de datos, patrones, decisiones técnicas |
| `API.md` | Referencia de funciones con ejemplos |
| `CONTRIBUTING.md` | Convenciones, testing manual, proceso PR |

## Commits

```
feat(filtros): agregar filtro de inversión
fix(crop): corregir posicionamiento maskCanvas
perf(sliders): agregar debounce a controles
```
Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`