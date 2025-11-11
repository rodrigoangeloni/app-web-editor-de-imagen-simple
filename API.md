# API Reference - Editor de Imágenes Web

Documentación completa de todas las funciones, variables globales y métodos del proyecto.

---

## 📚 Índice

- [Variables Globales](#variables-globales)
- [Funciones Principales](#funciones-principales)
- [Funciones Utilitarias](#funciones-utilitarias)
- [Event Handlers](#event-handlers)
- [Integraciones con Librerías](#integraciones-con-librerías)

---

## 🌐 Variables Globales

### Estado de la Aplicación

#### `cropper`
```javascript
let cropper;
```
- **Tipo:** `Cropper | null`
- **Descripción:** Instancia de Cropper.js que maneja la funcionalidad de recorte
- **Inicialización:** `handleFileSelect()` después de cargar imagen
- **Uso:** Obtener canvas recortado, datos de crop, destruir instancia

**Métodos disponibles:**
- `cropper.getData()` - Coordenadas y dimensiones del recorte
- `cropper.getCroppedCanvas()` - Canvas con región recortada
- `cropper.getCropBoxData()` - Posición del crop box en viewport
- `cropper.destroy()` - Limpiar instancia

---

#### `currentFile`
```javascript
let currentFile;
```
- **Tipo:** `File | null`
- **Descripción:** Referencia al archivo de imagen original subido por el usuario
- **Inicialización:** `handleFileSelect(file)`
- **Uso:** Validaciones, metadata

---

#### `originalImage`
```javascript
let originalImage = null;
```
- **Tipo:** `ImageData | null`
- **Descripción:** Backup del ImageData original sin procesar
- **Propósito:** Permitir reset de cambios (para implementación futura de undo/redo)
- **Estructura:**
  ```javascript
  {
    data: Uint8ClampedArray, // RGBA values [r1,g1,b1,a1,r2,g2,b2,a2,...]
    width: number,
    height: number
  }
  ```

---

#### `originalWidth`, `originalHeight`, `originalAspectRatio`
```javascript
let originalWidth = 0;
let originalHeight = 0;
let originalAspectRatio = 1;
```
- **Tipo:** `number`
- **Descripción:** Dimensiones naturales de la imagen cargada
- **Cálculo:** `originalAspectRatio = originalWidth / originalHeight`
- **Uso:** Mantener relación de aspecto en redimensionado

---

#### `currentFilter`
```javascript
let currentFilter = 'none';
```
- **Tipo:** `'none' | 'grayscale' | 'sepia'`
- **Descripción:** Filtro actualmente aplicado
- **Cambio:** Usar `setActiveFilter(filterName)`

---

## 🔧 Funciones Principales

### `handleFileSelect(file)`

Procesa el archivo de imagen seleccionado por el usuario (vía input o drag-drop).

**Parámetros:**
- `file` _(File)_ - Objeto File del navegador

**Validaciones:**
1. **Tipo de archivo:**
   ```javascript
   if (!file.type.match('image.*')) {
       alert('Por favor selecciona un archivo de imagen válido');
       return;
   }
   ```
   Acepta: JPEG, PNG, GIF, WEBP, BMP, SVG (lo que Canvas API soporte)

2. **Tamaño:**
   ```javascript
   if (file.size > 10 * 1024 * 1024) { // 10MB
       alert('El archivo es demasiado grande (máximo 10MB)');
       return;
   }
   ```

**Flujo:**
1. Validar archivo
2. Leer con FileReader como DataURL
3. Asignar a `imagePreview.src`
4. Al cargar (`onload`):
   - Guardar dimensiones originales
   - Crear backup en `originalImage`
   - Destruir Cropper anterior (si existe)
   - Inicializar nuevo Cropper
   - Llamar `resetControls()`

**Side Effects:**
- Modifica: `currentFile`, `originalWidth`, `originalHeight`, `originalAspectRatio`, `originalImage`, `cropper`
- Inicializa: Instancia de Cropper.js
- Actualiza: DOM (`imagePreview.src`)

**Ejemplo de uso:**
```javascript
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFileSelect(e.target.files[0]);
    }
});
```

---

### `applyTransformations()`

Aplica todas las transformaciones seleccionadas en tiempo real y renderiza preview.

**Parámetros:** Ninguno (lee estado global)

**Precondiciones:**
- `currentFile !== null`
- `cropper` inicializado y listo
- `originalImage !== null`

**Pipeline de procesamiento:**
1. Validar estado
2. Obtener canvas recortado: `cropper.getCroppedCanvas()`
3. Crear canvas temporal de trabajo
4. Obtener ImageData
5. **Aplicar contraste:**
   ```javascript
   factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
   newPixel = factor * (oldPixel - 128) + 128
   ```
6. **Aplicar filtro activo:**
   - `grayscale`: Promedio RGB
   - `sepia`: Matriz de conversión
7. **Aplicar eliminación de fondo:**
   - Comparar cada píxel con `bgColorInput.value`
   - Si similar (dentro de tolerancia): `alpha = 0`
8. Actualizar ImageData en canvas
9. Posicionar y mostrar `maskCanvas` sobre crop box

**Performance:**
- Tiempo típico: 30-500ms (depende de resolución)
- Bloquea main thread (síncrono)
- Se dispara en cada cambio de control UI

**Side Effects:**
- Modifica: `maskCanvas` (posición, contenido, visibilidad)
- No modifica: Imagen original

**Cuándo se llama:**
- Evento `ready` de Cropper
- Evento `crop` de Cropper
- Cambio en cualquier control (contraste, filtro, tolerancia, etc.)
- `updateDimensions()`

---

### `processAndDownload()`

Genera la imagen final con todas las transformaciones y la descarga.

**Parámetros:** Ninguno

**Precondiciones:**
- `currentFile !== null`
- `cropper` listo

**Pipeline de procesamiento:**
1. **Obtener canvas base:**
   ```javascript
   let canvasToDownload = cropper.getCroppedCanvas();
   ```

2. **Redimensionar (si aplica):**
   ```javascript
   // Si se especificó width/height o percent
   if (finalWidth !== canvasOriginal.width || finalHeight !== canvasOriginal.height) {
       const tempCanvas = document.createElement('canvas');
       tempCanvas.width = finalWidth;
       tempCanvas.height = finalHeight;
       ctx.drawImage(canvasToDownload, 0, 0, finalWidth, finalHeight);
       canvasToDownload = tempCanvas;
   }
   ```

3. **Aplicar contraste:**
   - Mismo algoritmo que `applyTransformations()`

4. **Aplicar filtros:**
   - Reaplicar grayscale o sepia según `currentFilter`

5. **Aplicar eliminación de fondo:**
   ```javascript
   if (bgColorInput.value !== '#ffffff' || tolValue > 0) {
       // Procesar píxeles
       if (hasTransparentPixels) {
           actualFormat = 'png'; // Forzar PNG para transparencia
       }
   }
   ```

6. **Convertir a Blob:**
   ```javascript
   canvasToDownload.toBlob((blob) => { ... }, mimeType);
   ```

7. **Comprimir:**
   ```javascript
   new Compressor(blob, {
       quality: qualitySlider.value / 100,
       mimeType: mimeType,
       success(result) {
           saveAs(result, `edited_image.${actualFormat}`);
       }
   });
   ```

**Formatos de salida:**
- JPEG: Si no hay transparencia y usuario seleccionó JPEG
- PNG: Si hay transparencia O usuario seleccionó PNG
- WEBP: Si usuario seleccionó WEBP

**Side Effects:**
- Dispara descarga del navegador
- No modifica estado de la aplicación

**Errores posibles:**
- `alert('Por favor sube una imagen primero')` - Si no hay imagen
- `alert('Error al procesar la imagen')` - Si getCroppedCanvas() falla
- `alert('Error al comprimir la imagen: ...')` - Error de Compressor.js

---

### `resetControls()`

Resetea todos los controles UI a valores por defecto.

**Parámetros:** Ninguno

**Valores por defecto:**
```javascript
qualitySlider.value = 90;
formatSelect.value = 'png';
widthInput.value = '';
heightInput.value = '';
percentInput.value = '100';
keepAspect.checked = true;
bgColorInput.value = '#ffffff';
toleranceInput.value = 10;
contrastSlider.value = 100;
maskCanvas.style.display = 'none';
currentFilter = 'none';
```

**Cuándo se llama:**
- Después de cargar nueva imagen en `handleFileSelect()`

---

### `setActiveFilter(filterName, isReset = false)`

Cambia el filtro activo y actualiza UI.

**Parámetros:**
- `filterName` _(string)_ - Nombre del filtro: `'none'`, `'grayscale'`, o `'sepia'`
- `isReset` _(boolean)_ - Si es true, no dispara `applyTransformations()` (para uso interno)

**Comportamiento:**
1. Actualiza `currentFilter`
2. Actualiza clases `.active` en botones de filtro
3. Si no es reset, llama `applyTransformations()`

**Ejemplo:**
```javascript
document.getElementById('filterGrayscale').addEventListener('click', () => 
    setActiveFilter('grayscale')
);
```

---

### `updateDimensions()`

Recalcula dimensiones basándose en inputs del usuario y mantiene aspect ratio si está activo.

**Parámetros:** Ninguno (lee inputs del DOM)

**Lógica:**
1. Leer `widthInput.value`, `heightInput.value`, `percentInput.value`
2. **Si percent está definido:**
   ```javascript
   newWidth = originalWidth * (percent / 100);
   newHeight = originalHeight * (percent / 100);
   // Actualizar inputs width/height
   ```
3. **Si width O height están definidos:**
   ```javascript
   if (keepAspect.checked) {
       if (newWidth && !newHeight) {
           newHeight = newWidth / originalAspectRatio;
       } else if (newHeight && !newWidth) {
           newWidth = newHeight * originalAspectRatio;
       }
   }
   ```
4. Llamar `applyTransformations()`

**Cuándo se llama:**
- Input en `widthInput`
- Input en `heightInput`
- Input en `percentInput`
- Change en `keepAspect`

---

## 🔨 Funciones Utilitarias

### `removeBackgroundFromEdges(imageData, targetColor, tolerancePercent)`

Elimina el fondo usando algoritmo Flood Fill desde los bordes de la imagen (BFS).

**Algoritmo:** Solo elimina píxeles conectados a los bordes que sean similares al color objetivo. Esto preserva áreas internas con colores similares.

**Parámetros:**
- `imageData` _(ImageData)_ - Datos de la imagen a procesar (se modifica in-place)
- `targetColor` _(Object)_ - Color del fondo `{r, g, b}` (0-255)
- `tolerancePercent` _(number)_ - Tolerancia de similitud (0-100)

**Retorna:** `void` (modifica imageData directamente)

**Complejidad:** O(n) donde n = width × height, pero típicamente solo procesa píxeles del fondo

**Ventajas vs. algoritmo global:**
- ✅ Preserva elementos internos con colores similares al fondo
- ✅ No elimina camisas blancas en fondo blanco
- ✅ No elimina ojos/dientes en retratos
- ❌ Falla si el sujeto toca los bordes de la imagen

**Algoritmo detallado:**
```javascript
1. Crear array de visitados (Uint8Array por eficiencia)
2. Escanear todos los píxeles del perímetro (top, bottom, left, right edges)
3. Para cada píxel del borde que coincida con targetColor:
   - Agregarlo a la cola BFS
   - Marcarlo como visitado
4. Mientras la cola no esté vacía:
   - Sacar píxel de la cola
   - Marcar su alpha como 0 (transparente)
   - Para cada vecino 4-connected (arriba, abajo, izq, der):
     - Si no fue visitado Y coincide con targetColor:
       - Agregarlo a la cola
       - Marcarlo como visitado
5. Resultado: Solo fondo conectado a bordes es transparente
```

**Ejemplo de uso:**
```javascript
const imageData = ctx.getImageData(0, 0, width, height);
const whiteBackground = { r: 255, g: 255, b: 255 };
removeBackgroundFromEdges(imageData, whiteBackground, 10);
ctx.putImageData(imageData, 0, 0);
// Solo el fondo blanco conectado a los bordes es eliminado
```

**Casos de uso ideales:**
- Fotos de productos con fondo uniforme
- Retratos de estudio con fondo sólido
- Documentos escaneados
- Imágenes con sujeto centrado

---

### `hexToRgb(hex)`

Convierte color hexadecimal a objeto RGB.

**Parámetros:**
- `hex` _(string)_ - Color en formato hexadecimal (ej: `"#ff5733"`)

**Retorna:**
- _(Object)_ - Objeto con propiedades `r`, `g`, `b` (valores 0-255)

**Implementación:**
```javascript
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}
```

**Ejemplos:**
```javascript
hexToRgb('#ffffff') // { r: 255, g: 255, b: 255 }
hexToRgb('#000000') // { r: 0, g: 0, b: 0 }
hexToRgb('#ff0000') // { r: 255, g: 0, b: 0 }
```

---

### `isColorSimilar(target, actual, tolerancePercent)`

Determina si dos colores son similares usando distancia euclidiana en espacio RGB.

**Parámetros:**
- `target` _(Object)_ - Color objetivo `{r, g, b}`
- `actual` _(Object)_ - Color a comparar `{r, g, b}`
- `tolerancePercent` _(number)_ - Tolerancia en porcentaje (0-100)

**Retorna:**
- _(boolean)_ - `true` si los colores son similares

**Algoritmo:**
```javascript
tolerance = tolerancePercent * 2.55  // Convertir 0-100 a 0-255
distance = sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)
return distance <= tolerance
```

**Rango de tolerancia:**
- `0`: Solo color exacto
- `10`: Muy estricto (diferencias sutiles)
- `50`: Moderado (variaciones visibles)
- `100`: Muy permisivo (gran rango de colores)

**Ejemplo:**
```javascript
const white = { r: 255, g: 255, b: 255 };
const nearWhite = { r: 250, g: 250, b: 250 };
const gray = { r: 200, g: 200, b: 200 };

isColorSimilar(white, nearWhite, 10); // true
isColorSimilar(white, gray, 10);      // false
isColorSimilar(white, gray, 50);      // true
```

**Uso en la aplicación:**
- Eliminación de fondo en `applyTransformations()` y `processAndDownload()`

---

## 🎮 Event Handlers

### Carga de Archivos

```javascript
// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// Click para abrir selector
dropZone.addEventListener('click', () => fileInput.click());

// Input file
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFileSelect(e.target.files[0]);
    }
});
```

### Controles de Calidad y Formato

```javascript
// Slider de calidad
qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
});

// Selector de formato
formatSelect.addEventListener('change', () => {
    // No requiere acción inmediata, se usa en processAndDownload()
});
```

### Controles de Transformación

```javascript
// Contraste
contrastSlider.addEventListener('input', () => {
    contrastValue.textContent = `${contrastSlider.value}%`;
    applyTransformations();
});

// Filtros
filterNoneBtn.addEventListener('click', () => setActiveFilter('none'));
filterGrayscaleBtn.addEventListener('click', () => setActiveFilter('grayscale'));
filterSepiaBtn.addEventListener('click', () => setActiveFilter('sepia'));

// Eliminación de fondo
bgColorInput.addEventListener('input', () => {
    applyTransformations();
});

toleranceInput.addEventListener('input', () => {
    toleranceValue.textContent = `${toleranceInput.value}%`;
    applyTransformations();
});
```

### Dimensiones

```javascript
widthInput.addEventListener('input', () => {
    updateDimensions();
    applyTransformations();
});

heightInput.addEventListener('input', () => {
    updateDimensions();
    applyTransformations();
});

keepAspect.addEventListener('change', () => {
    updateDimensions();
    applyTransformations();
});

percentInput.addEventListener('input', () => {
    updateDimensions();
    applyTransformations();
});
```

### Descarga

```javascript
downloadBtn.addEventListener('click', processAndDownload);
```

---

## 🔗 Integraciones con Librerías

### Cropper.js

**Inicialización:**
```javascript
cropper = new Cropper(imagePreview, {
    viewMode: 1,          // Restricción: crop box dentro del canvas
    autoCropArea: 1,      // Crop box inicial al 100%
    responsive: true,     // Redimensiona con viewport
    ready: function () {
        applyTransformations(); // Primera aplicación
    },
    crop: function() {
        applyTransformations(); // En cada cambio de crop
    }
});
```

**Métodos usados:**
- `cropper.getData(true)` - Coordenadas redondeadas del crop
- `cropper.getCroppedCanvas()` - Canvas con región recortada
- `cropper.getCropBoxData()` - Posición del crop box (para posicionar maskCanvas)
- `cropper.destroy()` - Limpiar al cargar nueva imagen

**Documentación:** https://github.com/fengyuanchen/cropperjs

---

### Compressor.js

**Uso:**
```javascript
new Compressor(blob, {
    quality: qualitySlider.value / 100,  // 0.0 - 1.0
    mimeType: `image/${format}`,         // 'image/jpeg', 'image/png', 'image/webp'
    success(result) {
        // result es un Blob comprimido
        saveAs(result, `edited_image.${format}`);
    },
    error(err) {
        console.error(err.message);
        alert('Error al comprimir la imagen: ' + err.message);
    }
});
```

**Comportamiento:**
- Calidad 100%: Sin compresión (puede aumentar tamaño si PNG → JPEG)
- Calidad 90%: Balance óptimo (recomendado por defecto)
- Calidad < 70%: Compresión agresiva (artefactos visibles)

**Documentación:** https://github.com/fengyuanchen/compressorjs

---

### FileSaver.js

**Uso:**
```javascript
saveAs(blob, filename);
```

**Parámetros:**
- `blob` _(Blob)_ - Datos del archivo
- `filename` _(string)_ - Nombre del archivo a descargar

**Comportamiento cross-browser:**
- Navegadores modernos: Usa `<a download>` nativo
- IE10+: Usa `navigator.msSaveBlob()`
- Fallback: Abre en nueva ventana

**Documentación:** https://github.com/eligrey/FileSaver.js/

---

## 📊 Estructuras de Datos

### ImageData

Estructura nativa de Canvas API.

```typescript
interface ImageData {
    data: Uint8ClampedArray;  // Array RGBA: [r,g,b,a, r,g,b,a, ...]
    width: number;            // Ancho en píxeles
    height: number;           // Alto en píxeles
}
```

**Acceso a píxel (x, y):**
```javascript
const index = (y * imageData.width + x) * 4;
const red   = imageData.data[index + 0];
const green = imageData.data[index + 1];
const blue  = imageData.data[index + 2];
const alpha = imageData.data[index + 3];
```

**Modificar píxel:**
```javascript
imageData.data[index + 0] = newRed;
imageData.data[index + 1] = newGreen;
imageData.data[index + 2] = newBlue;
imageData.data[index + 3] = newAlpha;  // 0 = transparente, 255 = opaco
```

---

### Blob

Representa datos binarios inmutables.

```typescript
interface Blob {
    size: number;      // Tamaño en bytes
    type: string;      // MIME type (ej: 'image/jpeg')
    slice(start?: number, end?: number, contentType?: string): Blob;
    stream(): ReadableStream;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
}
```

**Crear Blob desde Canvas:**
```javascript
canvas.toBlob((blob) => {
    console.log(blob.size);  // Tamaño en bytes
    console.log(blob.type);  // 'image/png'
}, 'image/png', 1.0);
```

---

## 🚨 Manejo de Errores

### Validaciones de Input

```javascript
// Archivo no es imagen
if (!file.type.match('image.*')) {
    alert('Por favor selecciona un archivo de imagen válido');
    return;
}

// Archivo muy grande
if (file.size > 10 * 1024 * 1024) {
    alert('El archivo es demasiado grande (máximo 10MB)');
    return;
}
```

### Validaciones de Estado

```javascript
// En applyTransformations()
if (!currentFile || !cropper || !cropper.ready || !originalImage) {
    maskCanvas.style.display = 'none';
    return;
}

// En processAndDownload()
if (!currentFile || !cropper || !cropper.ready) {
    alert('Por favor sube una imagen primero');
    return;
}
```

### Errores de Compresión

```javascript
new Compressor(blob, {
    // ...
    error(err) {
        console.error(err.message);
        alert('Error al comprimir la imagen: ' + err.message);
    }
});
```

---

## 🧪 Casos de Prueba Recomendados

### Test Suite Sugerido

```javascript
// Unit Tests
describe('hexToRgb', () => {
    test('convierte blanco correctamente', () => {
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
});

describe('isColorSimilar', () => {
    test('detecta colores idénticos', () => {
        const color = { r: 100, g: 100, b: 100 };
        expect(isColorSimilar(color, color, 0)).toBe(true);
    });
    
    test('respeta tolerancia', () => {
        const c1 = { r: 100, g: 100, b: 100 };
        const c2 = { r: 110, g: 110, b: 110 };
        expect(isColorSimilar(c1, c2, 5)).toBe(false);
        expect(isColorSimilar(c1, c2, 10)).toBe(true);
    });
});

// Integration Tests
describe('handleFileSelect', () => {
    test('rechaza archivos no-imagen', () => {
        const file = new File([''], 'test.txt', { type: 'text/plain' });
        // Expect alert to be called
    });
    
    test('rechaza archivos > 10MB', () => {
        const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
        // Expect alert to be called
    });
});
```

---

## 📖 Ejemplos de Uso Completos

### Ejemplo 1: Cargar y Procesar Imagen Programáticamente

```javascript
// Simular carga de archivo
const fileInput = document.getElementById('fileInput');
const file = new File([/* binary data */], 'test.jpg', { type: 'image/jpeg' });
const dataTransfer = new DataTransfer();
dataTransfer.items.add(file);
fileInput.files = dataTransfer.files;

// Disparar handler
handleFileSelect(file);
```

### Ejemplo 2: Aplicar Filtro y Descargar

```javascript
// Esperar a que imagen cargue
setTimeout(() => {
    // Aplicar filtro sepia
    setActiveFilter('sepia');
    
    // Ajustar contraste
    document.getElementById('contrast').value = 120;
    applyTransformations();
    
    // Descargar
    processAndDownload();
}, 1000);
```

### Ejemplo 3: Eliminar Fondo Blanco

```javascript
// Configurar color objetivo
document.getElementById('bgColor').value = '#ffffff';

// Configurar tolerancia
document.getElementById('tolerance').value = 20;

// Aplicar
applyTransformations();

// Preview visible en maskCanvas
```

---

## 🔄 Ciclo de Vida de una Sesión Típica

```javascript
// 1. Usuario carga página
// → Event listeners registrados

// 2. Usuario arrastra imagen
// → dropZone 'dragover' → addClass('dragover')

// 3. Usuario suelta imagen
// → dropZone 'drop' → handleFileSelect(file)

// 4. Imagen válida
// → FileReader lee archivo
// → imagePreview.onload
// → Cropper inicializa
// → applyTransformations() (primera vez)

// 5. Usuario ajusta contraste
// → contrastSlider 'input' → applyTransformations()

// 6. Usuario selecciona filtro grayscale
// → filterGrayscaleBtn 'click' → setActiveFilter('grayscale') → applyTransformations()

// 7. Usuario configura eliminación de fondo
// → bgColorInput 'input' → applyTransformations()
// → toleranceInput 'input' → applyTransformations()

// 8. Usuario ajusta recorte
// → cropper 'crop' → applyTransformations()

// 9. Usuario hace clic en descargar
// → downloadBtn 'click' → processAndDownload()
// → Canvas final procesado
// → Compressor comprime
// → FileSaver descarga

// 10. Archivo descargado, usuario puede seguir editando
// → Loop desde paso 5
```

---

**Autor:** Rodrigo Angeloni  
**Última actualización:** Noviembre 2025  
**Versión de la API:** 1.0.0
