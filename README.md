<div align="center">

<img src="assets/img/logo.webp" alt="Editor de Imágenes" width="64" />

# Editor de Imágenes Web

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Zero build](https://img.shields.io/badge/build-none%20needed-6366f1?style=flat-square)

[Características](#características) • [Inicio rápido](#inicio-rápido) • [Uso](#uso) • [Cómo funciona](#cómo-funciona) • [Atajos](#atajos-de-teclado) • [Problemas comunes](#problemas-comunes)

![Captura del editor con una imagen cargada](assets/img/editor.png)

</div>

Editor de imágenes completo que corre **100% en el navegador**: sin backend, sin instalación y sin subir tus imágenes a ningún servidor. Todo el procesamiento se hace en local, con **aceleración GPU** (WebGPU/WebGL2 con fallback CPU) y fondo con **IA on-device** opcional.

> [!TIP]
> Sirve el proyecto por HTTP (`python -m http.server 8000`) en lugar de abrir `index.html` directamente: así evitas restricciones de CORS y Canvas.

## Características

**Carga y recorte**
- Carga por clic en "Cargar", arrastrar y soltar sobre el canvas, o clic en el estado vacío. Validación de tipo y tamaño (máx. 10 MB).
- Recorte interactivo con Cropper.js y panel informativo en el header (dimensiones, peso, formato).

**Ajustes y filtros**
- Brillo, contraste y saturación (0–200 %) con previsualización en tiempo real **acelerada por GPU** (badge en el header indica WebGPU / WebGL2 / CPU).
- Filtros: original, escala de grises, sepia e invertir.
- Rotación ±90° y volteo horizontal/vertical.

**Eliminación de fondo**
- Selector de color + tolerancia, con modo *flood fill desde bordes* (preserva elementos internos del mismo color) o modo global.
- **Fondo con IA local (beta)**: MODNet on-device (Apache-2.0), o RMBG-1.4 opcional (solo uso no-comercial), sin subir la imagen. La máscara sobrevive a cambios de sliders.

**Exportación**
- Formatos JPEG, PNG, WEBP y AVIF con control de calidad y compresión en cliente.
- Export de imágenes grandes en Web Worker (sin congelar la UI); etapa de color en WebGPU cuando está disponible.
- El formato cambia automáticamente a PNG si la imagen tiene transparencia.
- El archivo descargado conserva el nombre original con sufijo `_edited`.

**Productividad y accesibilidad**
- Deshacer/rehacer (20 estados), comparación A/B manteniendo pulsado, y reseteo total.
- Notificaciones toast, indicador de carga, atajos de teclado y controles ARIA.
- Sidebar con secciones colapsables para organizar las herramientas.
- Respeta `prefers-reduced-motion`, objetivos táctiles ≥ 44 px y diseño responsive.

## Inicio rápido

Sin instalación ni dependencias. Solo necesitas un navegador moderno y un servidor HTTP local:

```powershell
python -m http.server 8000
# o bien
npx http-server -p 8000
```

Abre `http://localhost:8000` y arrastra una imagen al área de carga.

## Uso

1. **Carga** una imagen con el botón "Cargar" en el header, arrastrando sobre el canvas, o haciendo clic en el área vacía.
2. **Edita** con el panel lateral: ajusta el recorte arrastrando el cuadro, mueve los sliders, aplica un filtro, activa la eliminación de fondo clásica o quita el fondo con IA.
3. **Descarga** con el botón verde (o `Ctrl+S`) en el formato y calidad elegidos.

### Layout de la interfaz

```
┌──────────────────────────────────────────────────────┬──────────────┐
│  Editor de Imágenes   [info]  [GPU]   [Cargar]       │              │
├──────────────────────────────────────────────────────┤   SIDEBAR    │
│                                                      │              │
│              CANVAS / IMAGEN                         │  Exportar    │
│           (área de recorte)                          │  Redimens.   │
│                                                      │  Transformar │
│                                                      │  Ajustes     │
│                                                      │  Filtros     │
│                                                      │  Fondo+IA    │
├──────────────────────────────────────────────────────┼──────────────┤
│                                                      │ [↺][↪][👁][⚡]│
│                                                      │ [Descargar]  │
└──────────────────────────────────────────────────────┴──────────────┘
```

El sidebar es scrolleable y sus secciones son colapsables para ahorrar espacio.

## Cómo funciona

```
archivo → handleFileSelect() → Cropper.js sobre #imagePreview
    → controles → applyTransformations() → etapa color GPU (WebGL2) o CPU → fondo clásico/IA → preview en #maskPreview
    → Descargar → processAndDownload() → Worker o WebGPU → Compressor.js / blob nativo (AVIF) → FileSaver.js
```

- El **preview** no reemplaza la imagen: se renderiza en un canvas (`#maskPreview`) superpuesto al área de recorte, con damero bajo las zonas transparentes (fondo eliminado).
- Preview y descarga comparten los mismos parámetros (`getFilterParams()`); la etapa de color corre en GPU cuando el navegador la ofrece.
- El fondo se elimina con *flood fill* (BFS) desde el perímetro, o con IA local bajo demanda (primera vez descarga el modelo, luego queda en caché).
- El procesamiento pesado de export va en Worker; las imágenes de más de ~25 MP muestran un aviso.

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+S` | Descargar imagen |
| `Ctrl+Z` / `Ctrl+Y` | Deshacer / rehacer |
| `Escape` | Resetear cambios |
| `Ctrl+←` / `Ctrl+→` | Rotar 90° |

## Tecnologías

| Librería | Versión (CDN) | Uso |
|----------|---------------|-----|
| [Cropper.js](https://github.com/fengyuanchen/cropperjs) | 1.5.12 | Recorte interactivo |
| [Compressor.js](https://github.com/fengyuanchen/compressorjs) | 1.1.1 | Compresión antes de descargar |
| [FileSaver.js](https://github.com/eligrey/FileSaver.js/) | 2.0.5 | Guardar el archivo final |
| [@huggingface/transformers](https://github.com/huggingface/transformers.js) | 3.5.1 (`+esm`) | Fondo IA on-device (MODNet/RMBG-1.4, WebGPU→WASM). Lazy-load solo al usar IA |
| WebGPU (WGSL) / WebGL2 | Nativo del navegador | Etapa de color en GPU, con fallback CPU |
| Inter (Google Fonts) | — | Tipografía |

> [!NOTE]
> Las librerías cargan desde CDN, así que la primera visita necesita conexión a internet.

## Estructura del proyecto

```
.
├── index.html      # Único punto de entrada: DOM + carga de CDN y js/*.js
├── js/main.js      # Lógica UI/Cropper/historial (closure DOMContentLoaded)
├── js/gpu.js       # Motor GPU: detección + filtros WebGL2/WebGPU (window.GPUEngine)
├── js/ai-bg.js     # Fondo IA local vía Transformers.js v3 (window.AIBackground)
├── js/pipeline.worker.js  # Worker: color + fondo clásico fuera del hilo principal
├── css/style.css   # Tema oscuro con variables :root, por secciones
└── assets/img/     # Capturas para este README
```

Los agentes de IA tienen guía propia en `AGENTS.md`.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| La imagen no carga | Formato no soportado o archivo > 10 MB | Usa JPG/PNG/WEBP/GIF de menos de 10 MB |
| `Cropper is not defined` en consola | El CDN no cargó (sin red) | Revisa tu conexión e intérnalo de nuevo |
| La UI se congela unos segundos | Imagen muy grande y navegador sin GPU expuesta (badge "CPU") | Actualiza Chrome/Edge y drivers; el export ya usa Worker automáticamente |
| La IA no carga el modelo | Sin conexión o CDN bloqueado | La primera vez necesita internet (~26 MB); luego funciona desde caché. El fondo clásico no necesita red |
| La IA dice "no detectó sujeto" | MODNet rinde en personas/mascotas | Prueba con una foto de persona, o usa el fondo clásico / RMBG-1.4 |
| AVIF no se descarga | El navegador no codifica AVIF | Elige WEBP o PNG (verás un aviso) |
| El fondo borra partes del sujeto | El sujeto toca el borde o tolerancia alta | Baja la tolerancia; el flood fill parte del perímetro |
| El JPEG descargado sale como PNG | Hay píxeles transparentes | Es el comportamiento esperado: PNG conserva la transparencia |
