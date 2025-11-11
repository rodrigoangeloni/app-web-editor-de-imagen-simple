# Editor de Imágenes Web

Este es un editor de imágenes simple basado en navegador que permite a los usuarios realizar varias operaciones de edición en sus imágenes.

## Características

*   **Cargar Imagen:** Carga imágenes desde tu dispositivo mediante selección de archivo o arrastrando y soltando.
*   **Recortar:** Recorta la imagen a las dimensiones deseadas usando una interfaz interactiva.
*   **Redimensionar:**
    *   Cambia el ancho y alto de la imagen.
    *   Opción para mantener la relación de aspecto.
    *   Escala la imagen por porcentaje.
    *   Unidades en píxeles o centímetros.
*   **Ajuste de Calidad:** Controla la calidad de la imagen para formatos con pérdida (como JPEG).
*   **Selección de Formato:** Descarga la imagen en formato JPEG, PNG o WEBP.
*   **Ajuste de Contraste:** Modifica el contraste de la imagen.
*   **Filtros de Imagen:**
    *   Escala de Grises
    *   Sepia
*   **Eliminar Fondo:**
    *   Selecciona un color de fondo para eliminar.
    *   Ajusta la tolerancia para la eliminación del color.
    *   Previsualización en tiempo real del área a eliminar.
*   **Optimización de Imagen:** Comprime la imagen antes de descargar para optimizar el tamaño del archivo.
*   **Previsualización en Tiempo Real:** La mayoría de los cambios se previsualizan instantáneamente.
*   **Descargar Imagen:** Descarga la imagen editada a tu dispositivo.

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
        *   **Eliminar fondo:** Selecciona el color con el selector de color y ajusta el slider de tolerancia. La previsualización mostrará las áreas afectadas con semitransparencia.
    *   La imagen principal se puede recortar arrastrando los bordes o las esquinas del cuadro de recorte.
4.  **Descargar la Imagen:**
    *   Una vez que estés satisfecho con las ediciones, haz clic en el botón "Descargar Imagen".
    *   La imagen se procesará y se descargará en el formato y calidad seleccionados. Si se eliminó el fondo, el formato se cambiará automáticamente a PNG si es necesario para admitir la transparencia.

## Estructura del Proyecto

```
.
├── css/
│   └── style.css       # Estilos para la aplicación
├── js/
│   └── main.js         # Lógica principal de JavaScript para el editor
├── index.html          # El archivo HTML principal
└── README.md           # Este archivo
```

## Posibles Mejoras Futuras

*   Más filtros de imagen (brillo, saturación, etc.).
*   Rotación y volteo de imagen.
*   Historial de deshacer/rehacer.
*   Guardar y cargar el estado del proyecto.
*   Soporte para capas.
*   Mejoras en la interfaz de usuario y la experiencia de usuario.

---

Creado como un proyecto de demostración.
Última actualización: Mayo 2024
