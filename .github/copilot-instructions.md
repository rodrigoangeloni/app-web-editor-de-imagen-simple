## Propósito

Guía concisa para agentes IA que trabajan en este repositorio: un editor de imágenes web (HTML/CSS/Vanilla JS) que usa Cropper.js, Compressor.js y FileSaver.js desde CDN.

## Archivo(s) clave

- `index.html` — entrada principal; incluye las librerías via CDN y carga `js/main.js`.
- `js/main.js` — lógica única y monolítica: carga de archivos, inicialización de Cropper, previsualización, filtros, eliminación de fondo y descarga.
- `css/style.css` — estilos globales; sigue layout basado en `.container`, `.editor-container`, `.image-container` y `.controls`.
- `README.md` — descripción del proyecto y lista de funcionalidades; usar para validar comportamientos esperados.

## Arquitectura y flujo de datos (big picture)

1. Usuario sube imagen (`fileInput` / `dropZone`) -> `handleFileSelect(file)` en `js/main.js`.
2. `Cropper` se inicializa sobre `#imagePreview`. Cambios en recorte disparan `applyTransformations()`.
3. `applyTransformations()` crea un canvas temporal, aplica contraste, filtros y preview de eliminación de fondo en `#maskPreview`.
4. `processAndDownload()` construye el canvas final, aplica redimensionado, filtros finales y eliminación de fondo, luego crea un Blob y lo comprime con `Compressor` y descarga con `FileSaver`.

## Convenciones específicas del proyecto

- Vanilla JS global: no hay bundler ni módulos. Colocar nuevo código en `js/main.js` o en un archivo nuevo cargado desde `index.html`.
- Selectores DOM basados en IDs (ej.: `imagePreview`, `quality`, `format`, `downloadBtn`) — usa esos IDs al añadir UI o tests.
- Límite de tamaño de archivo: 10 MB (ver `handleFileSelect`). No cambiar sin actualizar mensajes al usuario.
- Formato forzado a `png` si la imagen contiene transparencia (ver lógica en `processAndDownload`).
- Calidad por defecto: 90% (slider `#quality`).

## Dependencias e integración

- Cropper.js, Compressor.js y FileSaver.js se incluyen por CDN en `index.html`. Actualizaciones de versión deben validarse manualmente (compatibilidad API).
- No hay backend: todo procesamiento se hace en cliente (canvas). Ten cuidado con operaciones costosas en imágenes muy grandes.

## Cómo abordar cambios comunes (ejemplos)

- Añadir un filtro nuevo: agregar botón en `index.html` dentro de `.filter-controls`, darle ID y manejarlo en `setActiveFilter()` y en los bucles de pixel-processing en `applyTransformations()` y `processAndDownload()`.
- Mejorar rendimiento de filtros: preferir WebGL/OffscreenCanvas si se añaden muchos efectos; documentar trade-offs en README.
- Añadir tests: no hay framework; para pruebas rápidas, crear una página de pruebas `test.html` que cargue imágenes de fixtures y ejecute funciones exportadas desde un `js/utils.js` separado.

## Debugging y flujo de desarrollo

- Para correr localmente: abrir `index.html` en el navegador (no hay build). En Windows, usar el explorador de archivos o un servidor estático simple si se necesita CORS.
- Puntos clave para inspección: consola del navegador, puntos de ruptura en `handleFileSelect`, `applyTransformations`, `processAndDownload`.

## Restricciones y notas detectadas

- No hay test suite ni CI configurado. Cambios que modifiquen la API pública del DOM (IDs) deben reflejarse en `index.html` y `js/main.js` conjuntamente.
- El proyecto asume imágenes razonablemente pequeñas (render en main thread). Para imágenes > 10MB la UI alerta y bloquea la carga.

Si falta algo importante (por ejemplo scripts de build locales o convenciones de commits), dime qué sección prefieres ampliar y la actualizo.
