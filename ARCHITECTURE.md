# Arquitectura del Editor de Imágenes Web

Este documento describe la arquitectura técnica, decisiones de diseño y patrones utilizados en el proyecto.

---

## 📐 Visión General

### Paradigma Arquitectónico

**Arquitectura Event-Driven Monolítica en Cliente**

El proyecto sigue un patrón event-driven puro donde:
- Los eventos del DOM disparan funciones de procesamiento
- El estado se mantiene en variables globales del módulo
- No hay separación explícita de capas (todo en `main.js`)
- Canvas API actúa como "modelo" de datos de la imagen

### Stack Tecnológico

```
┌─────────────────────────────────────────┐
│           Navegador (Cliente)           │
├─────────────────────────────────────────┤
│  HTML5 (Estructura)                     │
│  CSS3 (Presentación)                    │
│  JavaScript ES6+ (Lógica)               │
├─────────────────────────────────────────┤
│  APIs del Navegador:                    │
│  • Canvas API (procesamiento)           │
│  • FileReader API (carga archivos)      │
│  • Blob API (generación archivos)       │
├─────────────────────────────────────────┤
│  Librerías Externas (CDN):              │
│  • Cropper.js v1.5.12 (recorte)         │
│  • Compressor.js v1.1.1 (compresión)    │
│  • FileSaver.js v2.0.5 (descarga)       │
└─────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos Detallado

### 1. Inicialización de la Aplicación

```
window.load
    ↓
DOMContentLoaded event
    ↓
Inicialización de referencias DOM:
• Inputs (fileInput, dropZone)
• Sliders (quality, contrast, tolerance)
• Botones (filtros, download)
    ↓
Registro de Event Listeners
    ↓
Estado: Esperando input del usuario
```

### 2. Carga de Imagen

```
Usuario selecciona imagen
    ↓
┌─────────────────────────────────┐
│  handleFileSelect(file)         │
├─────────────────────────────────┤
│ 1. Validar tipo MIME            │
│    • Debe ser image/*           │
│    • Alert si falla             │
│                                 │
│ 2. Validar tamaño               │
│    • Max 10MB                   │
│    • Alert si excede            │
│                                 │
│ 3. FileReader.readAsDataURL()   │
│    • Convierte a base64         │
│                                 │
│ 4. imagePreview.src = dataURL   │
│                                 │
│ 5. imagePreview.onload:         │
│    • Guardar dimensiones        │
│    • Crear originalImage        │
│      (ImageData backup)         │
│    • Inicializar Cropper        │
│    • resetControls()            │
└─────────────────────────────────┘
    ↓
Estado: Imagen cargada, esperando ediciones
```

### 3. Pipeline de Transformaciones en Tiempo Real

```
Usuario ajusta control (slider, filtro, etc.)
    ↓
Event listener dispara
    ↓
┌──────────────────────────────────────┐
│  applyTransformations()              │
├──────────────────────────────────────┤
│ 1. Validar estado                    │
│    • ¿Existe currentFile?            │
│    • ¿Cropper está listo?            │
│    • ¿originalImage existe?          │
│    • Exit si falla alguna            │
│                                      │
│ 2. cropper.getCroppedCanvas()        │
│    • Obtener región recortada        │
│    • Respeta zoom y rotación         │
│                                      │
│ 3. Crear canvas temporal             │
│    workingCanvas = new Canvas()      │
│    ctx.drawImage(croppedCanvas)      │
│                                      │
│ 4. Obtener ImageData                 │
│    imageData = ctx.getImageData()    │
│    data = imageData.data (Uint8ClampedArray) │
│                                      │
│ 5. Aplicar CONTRASTE                 │
│    Formula: factor * (pixel - 128) + 128 │
│    factor = (259*(contrast+255)) /   │
│             (255*(259-contrast))     │
│    Para cada píxel RGB               │
│                                      │
│ 6. Aplicar FILTRO activo             │
│    switch(currentFilter):            │
│      • 'grayscale': avg = (r+g+b)/3  │
│      • 'sepia': matriz de conversión │
│      • 'none': sin cambios           │
│                                      │
│ 7. Aplicar ELIMINACIÓN DE FONDO      │
│    Para cada píxel:                  │
│      Si isColorSimilar(bgColor):     │
│        alpha = 0 (transparente)      │
│                                      │
│ 8. ctx.putImageData(imageData)       │
│                                      │
│ 9. Renderizar en maskCanvas          │
│    • Posicionar sobre crop box       │
│    • z-index: 10 (sobre imagen)      │
│    • display: block                  │
└──────────────────────────────────────┘
    ↓
Usuario ve preview en tiempo real
```

### 4. Pipeline de Descarga

```
Usuario hace clic en "Descargar Imagen"
    ↓
┌───────────────────────────────────────┐
│  processAndDownload()                 │
├───────────────────────────────────────┤
│ 1. Validar estado (cropper ready)     │
│                                       │
│ 2. Obtener canvas base                │
│    canvas = cropper.getCroppedCanvas()│
│                                       │
│ 3. REDIMENSIONAR (si aplica)          │
│    • Leer width/height inputs         │
│    • O calcular por percent           │
│    • Si keepAspect: ajustar otro eje  │
│    • Crear nuevo canvas redimensionado│
│    • drawImage con nuevas dimensiones │
│                                       │
│ 4. CONTRASTE (reaplicar)              │
│    • Mismo algoritmo que preview      │
│    • getImageData → procesar → put    │
│                                       │
│ 5. FILTROS (reaplicar)                │
│    • Grayscale o Sepia según activo   │
│                                       │
│ 6. ELIMINACIÓN DE FONDO (reaplicar)   │
│    • Detectar si hay transparencia    │
│    • Si hasTransparentPixels:         │
│      actualFormat = 'png'             │
│                                       │
│ 7. canvas.toBlob(callback, mimeType)  │
│                                       │
│ 8. Blob recibido → Compressor.js      │
│    new Compressor(blob, {             │
│      quality: slider.value / 100,     │
│      mimeType: 'image/' + format,     │
│      success: compressedBlob => {     │
│        ...                            │
│      }                                │
│    })                                 │
│                                       │
│ 9. FileSaver.saveAs(blob, filename)   │
│    • Genera link <a> temporal         │
│    • Dispara descarga del navegador   │
└───────────────────────────────────────┘
    ↓
Archivo descargado en sistema del usuario
```

---

## 🏛️ Patrones de Diseño Utilizados

### 1. **Module Pattern (Implícito)**

Todo el código está envuelto en un `DOMContentLoaded` event listener, creando un closure que:
- Mantiene variables privadas (no contaminan scope global)
- Expone funcionalidad solo vía event handlers
- Simula un módulo sin usar ES6 modules

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Scope privado del módulo
    let cropper;
    let currentFile;
    // ...
    
    // "Métodos públicos" vía eventos
    downloadBtn.addEventListener('click', processAndDownload);
});
```

### 2. **Strategy Pattern (Filtros)**

Los filtros usan un patrón de estrategia implícito:

```javascript
// Variable de estado almacena estrategia activa
let currentFilter = 'none';

// Selector de estrategia
function setActiveFilter(filterName) {
    currentFilter = filterName;
    applyTransformations();
}

// Ejecutor de estrategia
if (currentFilter === 'grayscale') {
    // Estrategia Grayscale
} else if (currentFilter === 'sepia') {
    // Estrategia Sepia
}
```

### 3. **Observer Pattern (Event-Driven)**

Toda la arquitectura sigue el patrón Observer:
- **Sujetos (Observables)**: Elementos DOM (inputs, sliders, botones)
- **Observadores**: Event listeners registrados
- **Notificaciones**: Eventos nativos del navegador (input, click, change)

```javascript
// Sujeto: contrastSlider
// Observador: función anónima
// Notificación: evento 'input'
contrastSlider.addEventListener('input', () => {
    contrastValue.textContent = `${contrastSlider.value}%`;
    applyTransformations(); // Reaccionar al cambio
});
```

### 4. **Template Method (applyTransformations)**

`applyTransformations()` define el "esqueleto" del algoritmo de procesamiento:

```javascript
function applyTransformations() {
    // 1. Obtener canvas (paso invariable)
    const canvas = cropper.getCroppedCanvas();
    
    // 2. Preparar ImageData (paso invariable)
    const imageData = ctx.getImageData(...);
    
    // 3. Aplicar contraste (paso invariable)
    applyContrast(imageData);
    
    // 4. Aplicar filtro (paso VARIABLE - Strategy)
    applyCurrentFilter(imageData);
    
    // 5. Aplicar bg removal (paso invariable)
    applyBackgroundRemoval(imageData);
    
    // 6. Renderizar (paso invariable)
    renderPreview(imageData);
}
```

---

## 🔧 Estado de la Aplicación

### Variables Globales (Estado Mutable)

```javascript
// === CROPPER ===
let cropper = null;              // Instancia de Cropper.js

// === IMAGEN ORIGINAL ===
let currentFile = null;          // File object del usuario
let originalImage = null;        // ImageData backup para reset
let originalWidth = 0;           // Ancho natural de la imagen
let originalHeight = 0;          // Alto natural
let originalAspectRatio = 1;     // width / height

// === ESTADO UI ===
let currentFilter = 'none';      // Filtro activo: 'none' | 'grayscale' | 'sepia'
```

### Flujo de Estado

```
INICIAL → IMAGEN_CARGADA → EDITANDO → DESCARGANDO → EDITANDO
  ↑                                                      ↓
  └──────────────────── Nueva imagen ───────────────────┘
```

**Estados válidos:**
- **INICIAL**: No hay imagen cargada, controles deshabilitados
- **IMAGEN_CARGADA**: Cropper inicializado, controles activos
- **EDITANDO**: Usuario ajusta controles, previews se actualizan
- **DESCARGANDO**: `processAndDownload()` ejecutándose (blocking)

---

## 🎨 Procesamiento de Imágenes: Algoritmos

### Ajuste de Contraste

**Fórmula matemática:**
```
factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
newPixel = factor * (oldPixel - 128) + 128
```

**Rango de contraste:**
- `0-100`: Reduce contraste (más gris)
- `100`: Sin cambio
- `100-200`: Aumenta contraste (más saturado)

**Implementación:**
```javascript
const contrastLevel = parseFloat(contrastSlider.value);
const factor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel));

for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp(factor * (data[i]   - 128) + 128, 0, 255); // Red
    data[i+1] = clamp(factor * (data[i+1] - 128) + 128, 0, 255); // Green
    data[i+2] = clamp(factor * (data[i+2] - 128) + 128, 0, 255); // Blue
}
```

### Filtro Grayscale (Escala de Grises)

**Método usado: Promedio Simple**
```
gray = (R + G + B) / 3
```

**Alternativas (no implementadas):**
- **Luminosidad**: `0.299*R + 0.587*G + 0.114*B` (percepción humana)
- **Desaturación**: `(max(R,G,B) + min(R,G,B)) / 2`

**Trade-off:** Promedio simple es más rápido pero menos preciso perceptualmente.

### Filtro Sepia

**Matriz de transformación:**
```
outputRed   = (inputRed * 0.393) + (inputGreen * 0.769) + (inputBlue * 0.189)
outputGreen = (inputRed * 0.349) + (inputGreen * 0.686) + (inputBlue * 0.168)
outputBlue  = (inputRed * 0.272) + (inputGreen * 0.534) + (inputBlue * 0.131)
```

**Resultado:** Tono cálido vintage marrón/naranja.

### Eliminación de Fondo

**Algoritmo principal: Flood Fill desde bordes (BFS)**

```javascript
function removeBackgroundFromEdges(imageData, targetColor, tolerancePercent) {
    // 1. Inicializar estructuras
    const visited = new Uint8Array(width * height);
    const queue = [];
    
    // 2. Agregar píxeles del perímetro que coincidan
    for (borde en [top, bottom, left, right]) {
        for (píxel en borde) {
            if (isColorSimilar(píxel, targetColor, tolerance)) {
                queue.push(píxel);
                visited[píxel] = 1;
            }
        }
    }
    
    // 3. BFS - Expandir desde bordes
    while (queue no vacía) {
        píxel = queue.pop();
        píxel.alpha = 0; // Transparente
        
        for (vecino en [arriba, abajo, izq, der]) {
            if (!visited[vecino] && isColorSimilar(vecino, targetColor)) {
                queue.push(vecino);
                visited[vecino] = 1;
            }
        }
    }
}
```

**Ventajas:**
- Solo elimina fondo conectado a los bordes
- Preserva elementos internos con colores similares
- Ejemplo: Camisa blanca en fondo blanco → camisa preservada

**Alternativa - Algoritmo global (legacy):**
```javascript
// Disponible desmarcando checkbox "Solo desde bordes"
for (cada píxel en imagen) {
    if (isColorSimilar(píxel, targetColor, tolerance)) {
        píxel.alpha = 0;
    }
}
```

**Comparación:**

| Aspecto | Flood Fill (Nuevo) | Global (Legacy) |
|---------|-------------------|-----------------|
| Precisión | Alta | Baja |
| Falsos positivos | Mínimos | Muchos |
| Casos de uso | Fondo uniforme | Eliminación agresiva |
| Complejidad | O(n) amortizado | O(n) |

**Limitaciones conocidas:**
- Si el sujeto toca los bordes, puede ser afectado
- Asume que el fondo está en el perímetro de la imagen
- No funciona con fondos complejos multicolor

**Mejora futura:** Algoritmos basados en IA (U2-Net, MODNet)

---

## 🚀 Decisiones de Rendimiento

### ¿Por qué procesamiento síncrono?

**Actual:** Todo en main thread, bloqueante

**Ventajas:**
- Código más simple
- No requiere manejar comunicación async
- Funciona bien para imágenes < 2MP

**Desventajas:**
- UI se congela en imágenes grandes (>5MP)
- No aprovecha múltiples cores

**Mejora futura:** Migrar a Web Workers

```javascript
// worker.js
self.onmessage = (e) => {
    const { imageData, filter, contrast } = e.data;
    // Procesar imageData
    self.postMessage({ processedData: imageData });
};

// main.js
const worker = new Worker('js/worker.js');
worker.postMessage({ imageData, filter: currentFilter, contrast });
worker.onmessage = (e) => {
    ctx.putImageData(e.data.processedData, 0, 0);
};
```

### ¿Por qué Canvas API vs. WebGL?

**Canvas 2D (actual):**
- ✅ Fácil de usar
- ✅ Compatible con todos los navegadores
- ❌ Lento para efectos complejos (blur, sharpen)

**WebGL (alternativa):**
- ✅ 10-100x más rápido con shaders
- ✅ Aprovecha GPU
- ❌ Curva de aprendizaje alta
- ❌ Código más complejo

**Trade-off:** Simplicidad vs. Performance

---

## 🔒 Consideraciones de Seguridad

### 1. **Validación de Input**

```javascript
// Validar tipo de archivo
if (!file.type.match('image.*')) {
    alert('Por favor selecciona un archivo de imagen válido');
    return;
}

// Validar tamaño
if (file.size > 10 * 1024 * 1024) { // 10MB
    alert('El archivo es demasiado grande (máximo 10MB)');
    return;
}
```

### 2. **Sanitización de DataURL**

FileReader genera DataURL base64. No hay riesgo de XSS porque:
- No se inyecta en DOM como HTML
- Solo se usa como `src` de `<img>` (contexto seguro)
- Canvas API valida formato internamente

### 3. **Privacidad**

✅ **Ventajas del procesamiento en cliente:**
- Imágenes nunca salen del dispositivo
- No hay servidor que pueda ser comprometido
- No se almacena metadata en servidor

❌ **Limitaciones:**
- Sin procesamiento server-side, no hay validación adicional
- Usuario podría manipular código JavaScript (pero solo afecta su propia sesión)

---

## 📦 Dependencias y Versionado

### Cropper.js v1.5.12

**Razón de elección:**
- ✅ Librería madura y estable
- ✅ API simple pero potente
- ✅ Soporte para touch devices
- ✅ Responsive por defecto

**Dependencias:** Ninguna

**Métodos clave usados:**
- `new Cropper(element, options)` - Inicialización
- `cropper.getData()` - Obtener coordenadas de recorte
- `cropper.getCroppedCanvas()` - Obtener canvas recortado
- `cropper.destroy()` - Limpiar instancia

**Alternativas consideradas:**
- **CropperJS v2**: Aún en beta
- **React-Cropper**: Requiere React (overkill)

### Compressor.js v1.1.1

**Razón de elección:**
- ✅ Compresión eficiente sin backend
- ✅ Soporte para calidad ajustable
- ✅ Mantiene EXIF data (opcional)

**API:**
```javascript
new Compressor(blob, {
    quality: 0.9,        // 0-1
    mimeType: 'image/jpeg',
    success(result) { /* compressed blob */ },
    error(err) { /* handle error */ }
});
```

### FileSaver.js v2.0.5

**Razón de elección:**
- ✅ Cross-browser compatibility
- ✅ Maneja quirks de diferentes navegadores
- ✅ Fallback para navegadores viejos

**API:**
```javascript
saveAs(blob, 'filename.jpg');
```

**Alternativa moderna:**
```javascript
// Nativo en navegadores modernos
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'filename.jpg';
a.click();
```

---

## 🧪 Testing (No Implementado)

### Estrategia de Testing Recomendada

**Unit Tests (funciones puras):**
- `hexToRgb()`
- `isColorSimilar()`

**Integration Tests:**
- Carga de imagen → Cropper inicializa
- Ajuste de contraste → Preview se actualiza
- Click en descargar → Archivo se genera

**E2E Tests:**
- Playwright/Cypress para flujos completos

**Framework sugerido:**
- Jest para unit tests
- Playwright para E2E

---

## 🔄 Ciclo de Vida de la Aplicación

```
┌─────────────────────────────────────────────────┐
│              PÁGINA CARGADA                     │
│  • DOM parsed                                   │
│  • Scripts CDN cargados                         │
│  • Event listeners registrados                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│          ESPERANDO IMAGEN                       │
│  • Controles deshabilitados/vacíos              │
│  • fileInput esperando input                    │
└──────────────────┬──────────────────────────────┘
                   │ Usuario sube imagen
                   ▼
┌─────────────────────────────────────────────────┐
│         IMAGEN CARGADA                          │
│  • FileReader.onload completo                   │
│  • originalImage guardado                       │
│  • Cropper.js inicializado                      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│            MODO EDICIÓN                         │
│  • Usuario ajusta controles                     │
│  • applyTransformations() ejecuta en cada cambio│
│  • Preview en tiempo real                       │
│                                                 │
│  Loop:                                          │
│    Cambio → Event → Apply → Render → Esperar   │
└──────────────────┬──────────────────────────────┘
                   │ Click en "Descargar"
                   ▼
┌─────────────────────────────────────────────────┐
│        PROCESAMIENTO FINAL                      │
│  • processAndDownload() ejecuta (blocking)      │
│  • Canvas final procesado                       │
│  • Compressor.js comprime                       │
│  • FileSaver.js descarga                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│          DESCARGA COMPLETA                      │
│  • Vuelve a MODO EDICIÓN                        │
│  • Usuario puede seguir editando                │
└─────────────────────────────────────────────────┘
```

---

## 📊 Métricas de Rendimiento

### Tiempos de Procesamiento (aproximados)

**Hardware de referencia:** Core i5, 8GB RAM, navegador Chrome

| Operación | 1000x1000px | 2000x2000px | 4000x4000px |
|-----------|-------------|-------------|-------------|
| Carga FileReader | ~50ms | ~150ms | ~500ms |
| Inicialización Cropper | ~100ms | ~200ms | ~400ms |
| applyTransformations() | ~30ms | ~120ms | ~500ms |
| processAndDownload() | ~200ms | ~800ms | ~3000ms |

**Bottleneck principal:** Procesamiento píxel a píxel en bucles `for`

### Memory Footprint

```
ImageData size = width × height × 4 bytes (RGBA)

Ejemplos:
• 1000x1000: 4 MB
• 2000x2000: 16 MB
• 4000x4000: 64 MB
• 8000x8000: 256 MB (puede causar crash)
```

**Múltiplos en memoria simultáneamente:**
1. Imagen original en DOM
2. `originalImage` (backup)
3. Canvas de Cropper
4. Canvas temporal en `applyTransformations()`
5. Canvas final en `processAndDownload()`

**Total:** ~5x el tamaño de ImageData

---

## 🔮 Roadmap de Arquitectura

### Fase 1: Modularización
- Separar funciones en módulos ES6
- `imageProcessor.js`, `filters.js`, `utils.js`
- Mejorar testing

### Fase 2: Performance
- Web Workers para procesamiento
- WebGL para filtros complejos
- Lazy loading de efectos

### Fase 3: Features Avanzadas
- State management (para undo/redo)
- Plugin system para filtros
- Backend opcional (para compartir)

---

## 🔗 Referencias

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Cropper.js Documentation](https://github.com/fengyuanchen/cropperjs)
- [Image Processing Algorithms](https://en.wikipedia.org/wiki/Digital_image_processing)
- [Web Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

---

**Autor:** Rodrigo Angeloni  
**Última actualización:** Noviembre 2025
