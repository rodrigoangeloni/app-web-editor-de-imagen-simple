# Editor de Imágenes Web

Un editor de imágenes potente y ligero basado en navegador que permite realizar operaciones avanzadas de edición sin necesidad de backend. Todo el procesamiento se realiza en el cliente usando Canvas API.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Cómo Usar](#cómo-usar)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Guía de Desarrollo](#guía-de-desarrollo)
- [API de Funciones](#api-de-funciones)
- [Troubleshooting](#troubleshooting)
- [Contribuir](#contribuir)
- [Posibles Mejoras Futuras](#posibles-mejoras-futuras)

## ✨ Características

### 📷 Carga y Recorte
*   **Cargar Imagen:** Carga imágenes desde tu dispositivo mediante selección de archivo o arrastrando y soltando.
*   **Información de Imagen:** Muestra dimensiones, tamaño y formato de la imagen cargada.
*   **Recortar:** Recorta la imagen a las dimensiones deseadas usando una interfaz interactiva.
*   **Redimensionar:**
    *   Cambia el ancho y alto de la imagen.
    *   Opción para mantener la relación de aspecto.
    *   Escala la imagen por porcentaje.
    *   Unidades en píxeles o centímetros.

### 🎨 Ajustes de Imagen
*   **Brillo:** Ajusta el brillo de la imagen (0% - 200%).
*   **Contraste:** Modifica el contraste de la imagen (0% - 200%).
*   **Saturación:** Controla la intensidad de los colores (0% - 200%).

### 🔄 Transformaciones
*   **Rotación:** Rota la imagen 90° a la izquierda o derecha.
*   **Volteo:** Voltea la imagen horizontal o verticalmente.

### 🎭 Filtros de Imagen
*   **Original:** Sin filtro aplicado.
*   **Escala de Grises:** Convierte a blanco y negro.
*   **Sepia:** Aplica tono sepia vintage.
*   **Invertir:** Invierte los colores de la imagen.

### ✂️ Eliminar Fondo
*   Selecciona un color de fondo para eliminar.
*   Ajusta la tolerancia para la eliminación del color.
*   **Modo "Solo desde bordes"** (recomendado): Elimina solo el fondo conectado a los bordes, preservando elementos internos con colores similares.
*   Modo global: Elimina todos los píxeles similares en toda la imagen.
*   Previsualización en tiempo real del área a eliminar.

### 💾 Exportación
*   **Ajuste de Calidad:** Controla la calidad de la imagen para formatos con pérdida.
*   **Selección de Formato:** Descarga la imagen en formato JPEG, PNG o WEBP.
*   **Optimización de Imagen:** Comprime la imagen antes de descargar.

### ⚡ Productividad
*   **Historial Deshacer/Rehacer:** Hasta 20 estados guardados con Ctrl+Z / Ctrl+Y.
*   **Comparación A/B:** Mantén presionado el botón "Comparar" para ver la imagen original.
*   **Resetear Cambios:** Vuelve al estado inicial con un clic o con Escape.
*   **Notificaciones Toast:** Feedback visual para todas las acciones.
*   **Indicador de Carga:** Spinner durante el procesamiento de la imagen.

### ⌨️ Atajos de Teclado
| Atajo | Acción |
|-------|--------|
| `Ctrl+S` | Descargar imagen |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Rehacer |
| `Escape` | Resetear cambios |
| `Ctrl+←` | Rotar 90° izquierda |
| `Ctrl+→` | Rotar 90° derecha |

### ♿ Accesibilidad
*   Atributos ARIA en todos los controles interactivos.
*   Tooltips descriptivos en todos los botones.
*   Roles semánticos para lectores de pantalla.

## Tecnologías Utilizadas

*   HTML5
*   CSS3
*   JavaScript (Vanilla)
*   **Bibliotecas Externas:**
    *   [Cropper.js](https://github.com/fengyuanchen/cropperjs) - Para la funcionalidad de recorte de imágenes.
    *   [Compressor.js](https://github.com/fengyuanchen/compressorjs) - Para la compresión de imágenes del lado del cliente.
    *   [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - Para guardar archivos en el lado del cliente.

## Cómo Usar

1.  Abre `index.html` en tu navegador web.
2.  **Cargar una Imagen:**
    *   Haz clic en el área designada "Arrastra tu imagen aquí o haz clic para seleccionar" para abrir el diálogo de selección de archivos.
    *   O, arrastra un archivo de imagen directamente al área designada.
3.  **Editar la Imagen:**
    *   Utiliza los controles en el panel derecho para aplicar las ediciones deseadas:
        *   **Calidad:** Ajusta el slider.
        *   **Formato:** Selecciona del menú desplegable.
        *   **Redimensionar:** Ingresa el ancho/alto o el porcentaje. Marca/desmarca "Mantener relación" según sea necesario.
        *   **Contraste:** Ajusta el slider.
        *   **Filtros:** Haz clic en los botones de filtro para aplicar/quitar.
        *   **Eliminar fondo:** Selecciona el color con el selector de color y ajusta el slider de tolerancia. 
            *   **Recomendado:** Mantén activado "Solo desde bordes" para eliminar solo el fondo sin afectar elementos internos de la imagen.
            *   Si desactivas "Solo desde bordes", se eliminará ese color en toda la imagen (útil para fondos complejos).
            *   La previsualización mostrará las áreas afectadas con semitransparencia.
    *   La imagen principal se puede recortar arrastrando los bordes o las esquinas del cuadro de recorte.
4.  **Descargar la Imagen:**
    *   Una vez que estés satisfecho con las ediciones, haz clic en el botón "Descargar Imagen".
    *   La imagen se procesará y se descargará en el formato y calidad seleccionados. Si se eliminó el fondo, el formato se cambiará automáticamente a PNG si es necesario para admitir la transparencia.

## Estructura del Proyecto

```
.
├── .github/
│   └── copilot-instructions.md  # Guía para agentes IA
├── css/
│   └── style.css                # Estilos para la aplicación
├── js/
│   └── main.js                  # Lógica principal de JavaScript para el editor
├── index.html                   # El archivo HTML principal
└── README.md                    # Este archivo
```

### Archivos Clave

- **`index.html`**: Punto de entrada. Carga librerías CDN (Cropper.js, Compressor.js, FileSaver.js) y estructura DOM.
- **`js/main.js`**: Contiene toda la lógica de la aplicación:
  - Event listeners para controles UI
  - Funciones de procesamiento de imágenes
  - Manipulación de Canvas API
  - Integración con librerías externas
- **`css/style.css`**: Estilos responsivos con diseño flexbox
- **`.github/copilot-instructions.md`**: Documentación para agentes IA sobre patrones y convenciones del proyecto

---

## 🏗️ Arquitectura

### Flujo de Datos Principal

```
Usuario sube imagen
    ↓
handleFileSelect(file)
    ↓
Validación (tipo, tamaño < 10MB)
    ↓
FileReader carga imagen → imagePreview
    ↓
Cropper.js inicializa sobre #imagePreview
    ↓
Usuario ajusta controles (filtros, contraste, etc.)
    ↓
Eventos disparan applyTransformations()
    ↓
Canvas temporal procesa efectos en tiempo real
    ↓
Preview se muestra en #maskPreview superpuesto
    ↓
Usuario hace clic en "Descargar"
    ↓
processAndDownload()
    ↓
Canvas final aplica todas las transformaciones
    ↓
Compressor.js optimiza imagen
    ↓
FileSaver.js descarga archivo
```

### Componentes Principales

#### 1. **Carga y Validación de Archivos**
- **Punto de entrada**: `handleFileSelect(file)`
- **Validaciones**:
  - Tipo de archivo (solo imágenes)
  - Tamaño máximo: 10MB
- **Modos de carga**:
  - Clic en zona de upload
  - Drag & drop
  - Input file oculto

#### 2. **Inicialización de Cropper**
- **Librería**: Cropper.js v1.5.12
- **Configuración**:
  ```javascript
  viewMode: 1,          // Restringir crop box al canvas
  autoCropArea: 1,      // Crop box ocupa 100% inicialmente
  responsive: true      // Redimensiona con viewport
  ```
- **Eventos**:
  - `ready`: Primera renderización → `applyTransformations()`
  - `crop`: Cada cambio en crop box → `applyTransformations()`

#### 3. **Aplicación de Transformaciones en Tiempo Real**
- **Función**: `applyTransformations()`
- **Proceso**:
  1. Obtiene canvas recortado de Cropper
  2. Crea canvas temporal para procesamiento
  3. Extrae ImageData para manipulación píxel a píxel
  4. Aplica efectos en orden:
     - **Contraste**: Fórmula de ajuste lineal
     - **Filtros**: Grayscale, Sepia (conversión RGB)
     - **Eliminación de fondo**: Comparación de color con tolerancia
  5. Renderiza resultado en `#maskPreview` superpuesto

#### 4. **Procesamiento Final y Descarga**
- **Función**: `processAndDownload()`
- **Pipeline**:
  1. **Redimensionado**: Si se especificó ancho/alto o porcentaje
  2. **Contraste**: Reaplicado al canvas final
  3. **Filtros**: Reaplicados (grayscale/sepia)
  4. **Eliminación de fondo**: Reaplicada
  5. **Formato forzado**: PNG si hay transparencia
  6. **Compresión**: Compressor.js con calidad seleccionada
  7. **Descarga**: FileSaver.js genera blob y descarga

### Decisiones de Diseño

#### **¿Por qué Vanilla JS y no un framework?**
- **Simplicidad**: Proyecto ligero sin necesidad de build tools
- **Rendimiento**: Sin overhead de framework para manipulación directa de Canvas
- **Portabilidad**: Un solo archivo HTML ejecutable sin dependencias npm

#### **¿Por qué procesamiento en cliente vs. servidor?**
- **Privacidad**: Imágenes nunca salen del dispositivo del usuario
- **Costo**: Sin infraestructura de backend necesaria
- **Velocidad**: Sin latencia de red para procesamiento

#### **¿Por qué librerías CDN vs. local?**
- **Actualizaciones**: Fácil actualización de versiones
- **Cache**: CDNs proveen cache global
- **Trade-off**: Requiere conexión a internet (puede mitigarse descargando libs localmente)

#### **Limitaciones Conocidas**
- **Rendimiento**: Procesamiento píxel a píxel en main thread puede bloquear UI en imágenes grandes (>5MP)
- **Memoria**: Imágenes muy grandes pueden causar crashes del navegador
- **Formatos**: No soporta HEIC, RAW u otros formatos exóticos (solo lo que Canvas API soporta)

---

## 🛠️ Guía de Desarrollo

### Requisitos

- Navegador moderno con soporte para:
  - Canvas API
  - FileReader API
  - ES6+ JavaScript
- (Opcional) Servidor HTTP local para desarrollo (evita restricciones CORS)

### Ejecutar Localmente

**Opción 1: Abrir directamente**
```powershell
# En Windows, desde el directorio del proyecto
start index.html
```

**Opción 2: Servidor HTTP simple**
```powershell
# Python 3
python -m http.server 8000

# Node.js (con http-server instalado globalmente)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Luego abrir: `http://localhost:8000`

### Agregar un Nuevo Filtro

1. **Agregar botón en HTML** (`index.html`):
```html
<button id="filterInvert" class="filter-btn">Invertir</button>
```

2. **Agregar event listener** (`js/main.js`):
```javascript
document.getElementById('filterInvert').addEventListener('click', () => 
    setActiveFilter('invert')
);
```

3. **Implementar lógica en `applyTransformations()`**:
```javascript
if (currentFilter === 'invert') {
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];       // Red
        data[i+1] = 255 - data[i+1];   // Green
        data[i+2] = 255 - data[i+2];   // Blue
    }
}
```

4. **Duplicar lógica en `processAndDownload()`** para aplicar en descarga final.

### Debugging

**Puntos de interrupción recomendados:**
- `handleFileSelect()`: Verificar carga de archivo
- `applyTransformations()`: Inspeccionar procesamiento de efectos
- `processAndDownload()`: Verificar pipeline de descarga

**Console logs útiles:**
```javascript
console.log('Dimensiones originales:', originalWidth, originalHeight);
console.log('Crop data:', cropper.getData());
console.log('ImageData:', imageData);
```

---

## 📚 API de Funciones

### Funciones Públicas Principales

#### `handleFileSelect(file)`
Procesa el archivo de imagen seleccionado por el usuario.

**Parámetros:**
- `file` (File): Objeto File del input o drag-drop

**Validaciones:**
- Tipo MIME debe ser `image/*`
- Tamaño máximo: 10MB

**Side Effects:**
- Inicializa Cropper.js
- Actualiza variables globales: `currentFile`, `originalWidth`, `originalHeight`, `originalImage`
- Resetea controles UI

---

#### `applyTransformations()`
Aplica todas las transformaciones seleccionadas en tiempo real y renderiza preview.

**Flujo:**
1. Obtiene canvas recortado de Cropper
2. Aplica contraste
3. Aplica filtro activo (grayscale/sepia/none)
4. Aplica eliminación de fondo
5. Renderiza en `#maskPreview`

**Performance:**
- Tiempo: ~50-200ms dependiendo de resolución
- Bloquea main thread (consideración para mejora futura)

---

#### `processAndDownload()`
Genera imagen final con todas las transformaciones y la descarga.

**Pipeline:**
1. Redimensiona canvas si se especificaron dimensiones
2. Aplica contraste final
3. Aplica filtros finales
4. Aplica eliminación de fondo final
5. Fuerza formato PNG si hay transparencia
6. Comprime con calidad seleccionada
7. Descarga vía FileSaver.js

**Formato de salida:**
- Nombre: `edited_image.{jpeg|png|webp}`
- MIME type: `image/{formato}`

---

#### `setActiveFilter(filterName)`
Cambia el filtro activo y actualiza UI.

**Parámetros:**
- `filterName` (string): `'none'`, `'grayscale'`, o `'sepia'`

**Side Effects:**
- Actualiza variable global `currentFilter`
- Actualiza clases CSS de botones (`.active`)
- Dispara `applyTransformations()`

---

### Funciones Utilitarias

#### `hexToRgb(hex)`
Convierte color hexadecimal a objeto RGB.

**Parámetros:**
- `hex` (string): Color hex (ej: `"#ffffff"`)

**Retorna:**
```javascript
{ r: number, g: number, b: number }
```

---

#### `isColorSimilar(target, actual, tolerancePercent)`
Determina si dos colores son similares dentro de una tolerancia.

**Algoritmo:** Distancia euclidiana en espacio RGB
```javascript
sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²) <= tolerance
```

**Parámetros:**
- `target` (Object): `{r, g, b}` - Color objetivo
- `actual` (Object): `{r, g, b}` - Color a comparar
- `tolerancePercent` (number): 0-100

**Retorna:** `boolean`

---

## 🐛 Troubleshooting

### Problema: La imagen no se carga

**Causas posibles:**
1. **Formato no soportado**: Verifica que sea JPG, PNG, WEBP o GIF
2. **Tamaño excede 10MB**: Reduce tamaño del archivo
3. **Archivo corrupto**: Intenta con otra imagen

**Solución:**
- Revisa la consola del navegador para errores específicos
- Asegúrate de que el navegador soporte Canvas API

---

### Problema: Filtros se aplican lentamente

**Causa:** Imagen de alta resolución (>4000x4000px) procesándose píxel a píxel en main thread

**Soluciones:**
- **Inmediata**: Reduce resolución de imagen antes de cargar
- **A largo plazo**: Implementar Web Workers para procesamiento asíncrono

---

### Problema: Descarga falla o genera archivo corrupto

**Causas posibles:**
1. **Formato incompatible con transparencia**: JPEG no soporta alpha channel
2. **Compresión extrema**: Calidad muy baja puede corromper imagen

**Solución:**
- Si usas eliminación de fondo, el formato se fuerza automáticamente a PNG
- Incrementa calidad (slider) si la imagen se ve corrupta

---

### Problema: Cropper no se inicializa

**Causa:** Librería CDN no cargó (problemas de red)

**Solución:**
```javascript
// Verificar en consola
typeof Cropper !== 'undefined'  // Debe ser true
```

Alternativamente, descargar librerías localmente:
```html
<link rel="stylesheet" href="libs/cropper.min.css">
<script src="libs/cropper.min.js"></script>
```

---

## 🤝 Contribuir

### Pautas de Código

1. **Estilo JavaScript:**
   - camelCase para variables y funciones
   - Comentar lógica compleja
   - Evitar modificaciones globales innecesarias

2. **Estilo CSS:**
   - BEM-like naming cuando sea apropiado
   - Media queries al final del archivo
   - Propiedades en orden alfabético

3. **Testing:**
   - Probar con imágenes de diferentes resoluciones (100x100 hasta 4000x4000)
   - Verificar en Chrome, Firefox, Safari, Edge
   - Probar tanto con mouse como con touch (dispositivos móviles)

### Proceso de Contribución

1. Fork el repositorio
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request con descripción detallada

### Ideas de Contribución

Ver sección [Posibles Mejoras Futuras](#posibles-mejoras-futuras) para ideas priorizadas.

---

## 🚀 Posibles Mejoras Futuras

### Prioridad Alta (Performance & Calidad)
*   **Web Workers** - Mover procesamiento pesado fuera del main thread
*   **WebGL Filters** - Usar shaders para filtros 10-100x más rápidos
*   **Eliminación de fondo con IA** - Usar modelos ONNX (u2net, rembg)
*   **Modo batch/lote** - Procesar múltiples imágenes con misma configuración
*   **Guardar/cargar presets** - Reutilizar configuraciones comunes

### Prioridad Media (Nuevas Funcionalidades)
*   **Más filtros de imagen** - Blur, sharpen, vintage, viñeta
*   **Ajuste de curvas** - Control avanzado de tonos
*   **Capas y máscaras** - Edición no destructiva
*   **Texto y marcas de agua** - Overlays personalizables

### Prioridad Baja (Pulido)
*   **Soporte para más formatos** - AVIF, HEIC (lectura)
*   **Ajuste automático** - Auto-contrast, auto-levels
*   **Temas claro/oscuro** - Preferencias de UI
*   **Exportar GIF animado** - Para comparaciones antes/después

### Consideraciones Técnicas
*   **Soporte offline** - Service Worker + Cache API
*   **Progressive Web App** - Manifest.json + instalable
*   **Internacionalización** - Múltiples idiomas (i18n)

---

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

Creado como un proyecto de demostración.
Última actualización: Diciembre 2025

## 📚 Documentación Completa

Este proyecto cuenta con documentación exhaustiva:

- **[README.md](README.md)** - Este archivo: Guía de usuario, características, cómo usar
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitectura técnica, flujo de datos, decisiones de diseño, patrones
- **[API.md](API.md)** - Referencia completa de funciones, parámetros, retornos y ejemplos
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guía para contribuidores: convenciones, testing, PR process
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Guía para agentes IA

**Código documentado:**
- `js/main.js` - Comentarios JSDoc en todas las funciones
- `css/style.css` - Comentarios organizacionales por secciones
