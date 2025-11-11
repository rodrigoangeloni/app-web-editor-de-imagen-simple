/**
 * @fileoverview Editor de Imágenes Web - Lógica Principal
 * @description Aplicación de edición de imágenes en cliente usando Canvas API,
 *              Cropper.js para recorte, Compressor.js para optimización y
 *              FileSaver.js para descarga.
 * @author Rodrigo Angeloni
 * @version 1.0.0
 * @license MIT
 */

document.addEventListener('DOMContentLoaded', function() {
    // ==================== REFERENCIAS DOM ====================
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const formatSelect = document.getElementById('format');
    const downloadBtn = document.getElementById('downloadBtn');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const unitSelect = document.getElementById('unit');
    const keepAspect = document.getElementById('keepAspect');
    const percentInput = document.getElementById('percent');
    const bgColorInput = document.getElementById('bgColor');
    const toleranceInput = document.getElementById('tolerance');
    const toleranceValue = document.getElementById('toleranceValue');
    const edgesOnlyCheckbox = document.getElementById('edgesOnly');
    const contrastSlider = document.getElementById('contrast'); // Added
    const contrastValue = document.getElementById('contrastValue'); // Added
    const maskCanvas = document.getElementById('maskPreview');
    const maskCtx = maskCanvas.getContext('2d');

    // Filter buttons
    const filterNoneBtn = document.getElementById('filterNone');
    const filterGrayscaleBtn = document.getElementById('filterGrayscale');
    const filterSepiaBtn = document.getElementById('filterSepia');
    
    /** @type {string} Filtro actualmente activo: 'none' | 'grayscale' | 'sepia' */
    let currentFilter = 'none'; // To store the currently active filter

    /** @type {Cropper|null} Instancia de Cropper.js para recorte interactivo */
    let cropper;
    
    /** @type {File|null} Archivo de imagen original seleccionado por el usuario */
    let currentFile;
    
    /** @type {ImageData|null} Backup del ImageData original sin procesar */
    let originalImage = null; // Store the original image data for reapplying filters
    
    /** @type {number} Ancho natural de la imagen original en píxeles */
    let originalWidth = 0;
    
    /** @type {number} Alto natural de la imagen original en píxeles */
    let originalHeight = 0;
    
    /** @type {number} Relación de aspecto original (width / height) */
    let originalAspectRatio = 1;

    // --- Event Listeners ---
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

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });

    dropZone.addEventListener('click', () => fileInput.click());

    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = `${qualitySlider.value}%`;
    });

    toleranceInput.addEventListener('input', () => {
        toleranceValue.textContent = `${toleranceInput.value}%`;
        applyTransformations();
    });

    bgColorInput.addEventListener('input', () => {
        applyTransformations();
    });

    edgesOnlyCheckbox.addEventListener('change', () => {
        applyTransformations();
    });

    contrastSlider.addEventListener('input', () => {
        contrastValue.textContent = `${contrastSlider.value}%`;
        applyTransformations();
    });

    // Filter button event listeners
    filterNoneBtn.addEventListener('click', () => setActiveFilter('none'));
    filterGrayscaleBtn.addEventListener('click', () => setActiveFilter('grayscale'));
    filterSepiaBtn.addEventListener('click', () => setActiveFilter('sepia'));

    // Handle dimension inputs
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

    // Handle download button click
    downloadBtn.addEventListener('click', processAndDownload);

    // ==================== FUNCIONES PRINCIPALES ====================
    
    /**
     * Procesa el archivo de imagen seleccionado por el usuario.
     * Valida tipo y tamaño, carga la imagen con FileReader, e inicializa Cropper.js.
     * 
     * @param {File} file - Objeto File del navegador (desde input o drag-drop)
     * @throws {Alert} Si el archivo no es una imagen válida
     * @throws {Alert} Si el archivo excede 10MB
     * @returns {void}
     * 
     * @example
     * fileInput.addEventListener('change', (e) => {
     *     if (e.target.files.length) {
     *         handleFileSelect(e.target.files[0]);
     *     }
     * });
     */
    function handleFileSelect(file) {
        if (!file.type.match('image.*')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('El archivo es demasiado grande (máximo 10MB)');
            return;
        }

        currentFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.onload = function() {
                originalWidth = imagePreview.naturalWidth;
                originalHeight = imagePreview.naturalHeight;
                originalAspectRatio = originalWidth / originalHeight;

                // Store original image data for filter reset/reapplication
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = originalWidth;
                tempCanvas.height = originalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(imagePreview, 0, 0);
                originalImage = tempCtx.getImageData(0, 0, originalWidth, originalHeight);

                if (cropper) {
                    cropper.destroy();
                }
                cropper = new Cropper(imagePreview, {
                    viewMode: 1,
                    autoCropArea: 1,
                    responsive: true,
                    ready: function () {
                        applyTransformations(); // Initial application of transformations
                    },
                    crop: function() {
                        applyTransformations(); // Apply transformations on crop
                    }
                });
                resetControls();
            };
        };
        reader.readAsDataURL(file);
    }

    /**
     * Resetea todos los controles UI a sus valores por defecto.
     * Se llama después de cargar una nueva imagen.
     * 
     * @returns {void}
     */
    function resetControls() {
        qualitySlider.value = 90;
        qualityValue.textContent = '90%';
        formatSelect.value = 'png';
        widthInput.value = '';
        heightInput.value = '';
        percentInput.value = '100';
        keepAspect.checked = true;
        bgColorInput.value = '#ffffff';
        toleranceInput.value = 10;
        toleranceValue.textContent = '10%';
        edgesOnlyCheckbox.checked = true;
        contrastSlider.value = 100;
        contrastValue.textContent = '100%';
        maskCanvas.style.display = 'none'; // Hide mask initially
        setActiveFilter('none', true); // Reset to no filter and update UI
    }

    /**
     * Cambia el filtro activo y actualiza la UI.
     * Actualiza los botones de filtro y aplica las transformaciones.
     * 
     * @param {('none'|'grayscale'|'sepia')} filterName - Nombre del filtro a activar
     * @param {boolean} [isReset=false] - Si es true, no dispara applyTransformations()
     * @returns {void}
     * 
     * @example
     * // Activar filtro sepia
     * setActiveFilter('sepia');
     * 
     * @example
     * // Reset sin disparar transformaciones (uso interno)
     * setActiveFilter('none', true);
     */
    function setActiveFilter(filterName, isReset = false) {
        currentFilter = filterName;
        // Update button active states
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        if (filterName === 'none') filterNoneBtn.classList.add('active');
        else if (filterName === 'grayscale') filterGrayscaleBtn.classList.add('active');
        else if (filterName === 'sepia') filterSepiaBtn.classList.add('active');
        
        if (!isReset) {
            applyTransformations();
        }
    }

    /**
     * Recalcula dimensiones basándose en los inputs del usuario.
     * Mantiene la relación de aspecto si está activado el checkbox correspondiente.
     * 
     * @returns {void}
     * 
     * @sideEffect Actualiza valores de widthInput y heightInput si es necesario
     * @sideEffect Dispara applyTransformations()
     */
    function updateDimensions() {
        if (!cropper || !cropper.ready || !originalImage) return;

        let newWidth = parseFloat(widthInput.value);
        let newHeight = parseFloat(heightInput.value);
        const scalePercent = parseFloat(percentInput.value) / 100;

        if (percentInput.value && percentInput.value !== '100') {
            newWidth = originalWidth * scalePercent;
            newHeight = originalHeight * scalePercent;
            widthInput.value = Math.round(newWidth);
            heightInput.value = Math.round(newHeight);
        } else if (newWidth || newHeight) {
            if (keepAspect.checked) {
                if (newWidth && !newHeight) {
                    newHeight = newWidth / originalAspectRatio;
                    heightInput.value = Math.round(newHeight);
                } else if (newHeight && !newWidth) {
                    newWidth = newHeight * originalAspectRatio;
                    widthInput.value = Math.round(newWidth);
                }
            }
        } else {
            // If no specific dimensions, use crop box or original
            const cropBoxData = cropper.getData(true); // get rounded data
            newWidth = cropBoxData.width;
            newHeight = cropBoxData.height;
        }
        // Cropper's setCanvasData or setData might be more appropriate here if we want to resize the cropper's canvas
        // For now, we'll let the download function handle final dimensions.
        applyTransformations(); // Re-apply transformations as dimensions affect them
    }

    /**
     * Aplica todas las transformaciones seleccionadas en tiempo real.
     * Crea un canvas temporal, procesa píxeles (contraste, filtros, bg removal)
     * y renderiza el preview en maskCanvas superpuesto sobre la imagen.
     * 
     * @returns {void}
     * 
     * @performance Tiempo típico: 30-500ms según resolución de imagen
     * @performance Bloquea el main thread (procesamiento síncrono)
     * 
     * @sideEffect Modifica el contenido y posición de maskCanvas
     * @sideEffect Puede ocultar maskCanvas si no hay imagen válida
     * 
     * @algorithm
     * 1. Obtener canvas recortado de Cropper
     * 2. Aplicar contraste: factor * (pixel - 128) + 128
     * 3. Aplicar filtro activo (grayscale/sepia)
     * 4. Aplicar eliminación de fondo por similitud de color
     * 5. Renderizar resultado en maskCanvas
     */
    function applyTransformations() {
        if (!currentFile || !cropper || !cropper.ready || !originalImage) {
            maskCanvas.style.display = 'none';
            return;
        }

        // Get the cropped canvas - this contains the current state of the cropped image
        const croppedCanvas = cropper.getCroppedCanvas();
        if (!croppedCanvas) {
            maskCanvas.style.display = 'none';
            return;
        }

        // Create a working canvas to apply effects
        const workingCanvas = document.createElement('canvas');
        workingCanvas.width = croppedCanvas.width;
        workingCanvas.height = croppedCanvas.height;
        const workingCtx = workingCanvas.getContext('2d');
        
        // Draw the cropped image to our working canvas
        workingCtx.drawImage(croppedCanvas, 0, 0);
        
        // Get the image data for manipulation
        const imageData = workingCtx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
        const data = imageData.data;

        // 1. Apply contrast
        const contrastLevel = parseFloat(contrastSlider.value);
        const factor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i+1] = Math.max(0, Math.min(255, factor * (data[i+1] - 128) + 128));
            data[i+2] = Math.max(0, Math.min(255, factor * (data[i+2] - 128) + 128));
        }

        // 2. Apply Filters
        if (currentFilter === 'grayscale') {
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                data[i] = avg; // red
                data[i+1] = avg; // green
                data[i+2] = avg; // blue
            }
        } else if (currentFilter === 'sepia') {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
        }

        // 3. Apply Background Removal preview
        const targetColor = hexToRgb(bgColorInput.value);
        const tolValue = parseInt(toleranceInput.value);
        
        if (bgColorInput.value !== '#ffffff' || tolValue > 0) {
            if (edgesOnlyCheckbox.checked) {
                // Algoritmo mejorado: Flood Fill desde bordes
                removeBackgroundFromEdges(imageData, targetColor, tolValue);
            } else {
                // Algoritmo original: Comparación global de píxeles
                for (let i = 0; i < data.length; i += 4) {
                    const pixelColor = { r: data[i], g: data[i+1], b: data[i+2] };
                    if (isColorSimilar(targetColor, pixelColor, tolValue)) {
                        data[i+3] = 0; // Make matching pixels fully transparent
                    }
                }
            }
        }

        // Put the modified data back to the working canvas
        workingCtx.putImageData(imageData, 0, 0);

        // Size and position the mask canvas
        maskCanvas.width = workingCanvas.width;
        maskCanvas.height = workingCanvas.height;
        
        // Position the mask canvas over the cropped area
        const cropBoxData = cropper.getCropBoxData();
        
        maskCanvas.style.position = 'absolute';
        maskCanvas.style.left = cropBoxData.left + 'px';
        maskCanvas.style.top = cropBoxData.top + 'px';
        maskCanvas.style.width = cropBoxData.width + 'px';
        maskCanvas.style.height = cropBoxData.height + 'px';
        maskCanvas.style.display = 'block';
        maskCanvas.style.zIndex = '10'; // Ensure it's above the image
        
        // Clear and draw the processed image to the mask canvas
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.drawImage(workingCanvas, 0, 0, maskCanvas.width, maskCanvas.height);
    }

    /**
     * Procesa la imagen final con todas las transformaciones y la descarga.
     * Aplica redimensionado, contraste, filtros y bg removal en el canvas final,
     * comprime con Compressor.js y descarga con FileSaver.js.
     * 
     * @returns {void}
     * 
     * @throws {Alert} Si no hay imagen cargada
     * @throws {Alert} Si hay error al procesar la imagen
     * @throws {Alert} Si Compressor.js falla
     * 
     * @algorithm
     * 1. Obtener canvas recortado de Cropper
     * 2. Redimensionar si se especificaron dimensiones
     * 3. Aplicar contraste
     * 4. Aplicar filtros (grayscale/sepia)
     * 5. Aplicar eliminación de fondo (forzar PNG si hay transparencia)
     * 6. Convertir a Blob
     * 7. Comprimir con calidad seleccionada
     * 8. Descargar archivo
     * 
     * @example
     * // Usuario hace clic en botón de descarga
     * downloadBtn.addEventListener('click', processAndDownload);
     */
    function processAndDownload() {
        if (!currentFile || !cropper || !cropper.ready) {
            alert('Por favor sube una imagen primero');
            return;
        }

        let canvasToDownload = cropper.getCroppedCanvas();
        if (!canvasToDownload) {
            alert('Error al procesar la imagen');
            return;
        }
        const ctx = canvasToDownload.getContext('2d');

        // --- Apply final transformations for download ---
        // 1. Resize (if width/height or percent is set)
        let finalWidth = parseFloat(widthInput.value);
        let finalHeight = parseFloat(heightInput.value);
        const scalePercent = parseFloat(percentInput.value) / 100;

        if (percentInput.value && percentInput.value !== '100') {
            finalWidth = canvasToDownload.width * scalePercent;
            finalHeight = canvasToDownload.height * scalePercent;
        } else if (finalWidth || finalHeight) {
            if (keepAspect.checked) {
                const currentAspectRatio = canvasToDownload.width / canvasToDownload.height;
                if (finalWidth && !finalHeight) {
                    finalHeight = finalWidth / currentAspectRatio;
                } else if (finalHeight && !finalWidth) {
                    finalWidth = finalHeight * currentAspectRatio;
                }
            }
        } else {
            finalWidth = canvasToDownload.width;
            finalHeight = canvasToDownload.height;
        }

        if (finalWidth !== canvasToDownload.width || finalHeight !== canvasToDownload.height) {
            const tempResizeCanvas = document.createElement('canvas');
            tempResizeCanvas.width = Math.round(finalWidth);
            tempResizeCanvas.height = Math.round(finalHeight);
            const tempResizeCtx = tempResizeCanvas.getContext('2d');
            tempResizeCtx.drawImage(canvasToDownload, 0, 0, tempResizeCanvas.width, tempResizeCanvas.height);
            canvasToDownload = tempResizeCanvas;
        }

        // 2. Contrast
        const contrastLevelDownload = parseFloat(contrastSlider.value);
        const factorDownload = (259 * (contrastLevelDownload + 255)) / (255 * (259 - contrastLevelDownload));
        const imageData = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factorDownload * (data[i] - 128) + 128));
            data[i+1] = Math.max(0, Math.min(255, factorDownload * (data[i+1] - 128) + 128));
            data[i+2] = Math.max(0, Math.min(255, factorDownload * (data[i+2] - 128) + 128));
        }
        ctx.putImageData(imageData, 0, 0);

        // 3. Apply Filters (final download)
        if (currentFilter === 'grayscale') {
            const imgDataForFilter = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
            const dataForFilter = imgDataForFilter.data;
            for (let i = 0; i < dataForFilter.length; i += 4) {
                const avg = (dataForFilter[i] + dataForFilter[i+1] + dataForFilter[i+2]) / 3;
                dataForFilter[i] = avg;
                dataForFilter[i+1] = avg;
                dataForFilter[i+2] = avg;
            }
            ctx.putImageData(imgDataForFilter, 0, 0);
        } else if (currentFilter === 'sepia') {
            const imgDataForFilter = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
            const dataForFilter = imgDataForFilter.data;
            for (let i = 0; i < dataForFilter.length; i += 4) {
                const r = dataForFilter[i];
                const g = dataForFilter[i+1];
                const b = dataForFilter[i+2];
                dataForFilter[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                dataForFilter[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                dataForFilter[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
            ctx.putImageData(imgDataForFilter, 0, 0);
        }

        // 4. Background Removal (final)
        const targetColor = hexToRgb(bgColorInput.value);
        const tolValue = parseInt(toleranceInput.value);
        let actualFormat = formatSelect.value;

        if (bgColorInput.value !== '#ffffff' || tolValue > 0) {
            const imgDataForBgRemoval = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
            const dataForBgRemoval = imgDataForBgRemoval.data;
            let hasTransparentPixels = false;
            
            if (edgesOnlyCheckbox.checked) {
                // Algoritmo mejorado: Flood Fill desde bordes
                removeBackgroundFromEdges(imgDataForBgRemoval, targetColor, tolValue);
                // Verificar si se crearon píxeles transparentes
                for (let i = 3; i < dataForBgRemoval.length; i += 4) {
                    if (dataForBgRemoval[i] === 0) {
                        hasTransparentPixels = true;
                        break;
                    }
                }
            } else {
                // Algoritmo original: Comparación global de píxeles
                for (let i = 0; i < dataForBgRemoval.length; i += 4) {
                    const pixelColor = { r: dataForBgRemoval[i], g: dataForBgRemoval[i+1], b: dataForBgRemoval[i+2] };
                    if (isColorSimilar(targetColor, pixelColor, tolValue)) {
                        dataForBgRemoval[i+3] = 0; // Set alpha to transparent
                        hasTransparentPixels = true;
                    }
                }
            }
            
            ctx.putImageData(imgDataForBgRemoval, 0, 0);
            if (hasTransparentPixels) {
                actualFormat = 'png'; // Force PNG if transparency is added
            }
        }

        // --- Compression and Download ---
        const mimeType = `image/${actualFormat}`;
        canvasToDownload.toBlob((blob) => {
            if (!blob) {
                alert('Error al crear el blob de la imagen.');
                return;
            }
            new Compressor(blob, {
                quality: qualitySlider.value / 100,
                mimeType: mimeType,
                success(result) {
                    saveAs(result, `edited_image.${actualFormat}`);
                },
                error(err) {
                    console.error(err.message);
                    alert('Error al comprimir la imagen: ' + err.message);
                }
            });
        }, mimeType);
    }

    // ==================== FUNCIONES UTILITARIAS ====================
    
    /**
     * Elimina el fondo usando algoritmo Flood Fill desde los bordes de la imagen.
     * Solo elimina píxeles conectados a los bordes que sean similares al color objetivo.
     * Esto preserva áreas internas con colores similares (ej: camisa blanca en fondo blanco).
     * 
     * @param {ImageData} imageData - Datos de la imagen a procesar
     * @param {{r: number, g: number, b: number}} targetColor - Color del fondo a eliminar
     * @param {number} tolerancePercent - Tolerancia de similitud (0-100)
     * @returns {void}
     * 
     * @algorithm
     * 1. Crear array de visitados (Uint8Array para eficiencia)
     * 2. Agregar todos los píxeles del perímetro a la cola si coinciden con targetColor
     * 3. BFS: Para cada píxel en cola:
     *    - Marcar como transparente (alpha = 0)
     *    - Agregar vecinos 4-connected si coinciden y no fueron visitados
     * 4. Resultado: Solo fondo conectado a bordes es removido
     * 
     * @performance O(n) donde n = width * height, pero solo procesa fondo
     */
    function removeBackgroundFromEdges(imageData, targetColor, tolerancePercent) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const visited = new Uint8Array(width * height); // 0 = no visitado, 1 = visitado
        const queue = [];
        
        /**
         * Obtiene el índice del array de píxeles para coordenadas (x, y)
         */
        const getPixelIndex = (x, y) => (y * width + x) * 4;
        const getVisitedIndex = (x, y) => y * width + x;
        
        /**
         * Verifica si píxel en (x, y) coincide con targetColor y lo agrega a la cola
         */
        const queueIfMatch = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return;
            
            const visitedIdx = getVisitedIndex(x, y);
            if (visited[visitedIdx]) return; // Ya visitado
            
            const pixelIdx = getPixelIndex(x, y);
            const pixelColor = {
                r: data[pixelIdx],
                g: data[pixelIdx + 1],
                b: data[pixelIdx + 2]
            };
            
            if (isColorSimilar(targetColor, pixelColor, tolerancePercent)) {
                visited[visitedIdx] = 1;
                queue.push({ x, y });
            }
        };
        
        // Paso 1: Agregar todos los píxeles del borde a la cola si coinciden
        
        // Top edge (y = 0)
        for (let x = 0; x < width; x++) {
            queueIfMatch(x, 0);
        }
        
        // Bottom edge (y = height - 1)
        for (let x = 0; x < width; x++) {
            queueIfMatch(x, height - 1);
        }
        
        // Left edge (x = 0), excluyendo esquinas ya procesadas
        for (let y = 1; y < height - 1; y++) {
            queueIfMatch(0, y);
        }
        
        // Right edge (x = width - 1)
        for (let y = 1; y < height - 1; y++) {
            queueIfMatch(width - 1, y);
        }
        
        // Paso 2: BFS - Procesar cola
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const pixelIdx = getPixelIndex(x, y);
            
            // Marcar píxel como transparente
            data[pixelIdx + 3] = 0;
            
            // Agregar vecinos 4-connected (arriba, abajo, izquierda, derecha)
            queueIfMatch(x, y - 1); // Arriba
            queueIfMatch(x, y + 1); // Abajo
            queueIfMatch(x - 1, y); // Izquierda
            queueIfMatch(x + 1, y); // Derecha
        }
    }
    
    /**
     * Convierte un color hexadecimal a objeto RGB.
     * 
     * @param {string} hex - Color en formato hexadecimal (ej: "#ff5733")
     * @returns {{r: number, g: number, b: number}} Objeto con componentes RGB (0-255)
     * 
     * @example
     * hexToRgb('#ffffff') // { r: 255, g: 255, b: 255 }
     * hexToRgb('#000000') // { r: 0, g: 0, b: 0 }
     * hexToRgb('#ff0000') // { r: 255, g: 0, b: 0 }
     */
    // --- Utility Functions ---
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    /**
     * Determina si dos colores son similares usando distancia euclidiana en espacio RGB.
     * 
     * @param {{r: number, g: number, b: number}} target - Color objetivo
     * @param {{r: number, g: number, b: number}} actual - Color a comparar
     * @param {number} tolerancePercent - Tolerancia en porcentaje (0-100)
     * @returns {boolean} true si los colores son similares dentro de la tolerancia
     * 
     * @algorithm
     * distance = sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)
     * tolerance_normalized = tolerancePercent * 2.55 (convertir 0-100 a 0-255)
     * return distance <= tolerance_normalized
     * 
     * @example
     * const white = { r: 255, g: 255, b: 255 };
     * const nearWhite = { r: 250, g: 250, b: 250 };
     * isColorSimilar(white, nearWhite, 10); // true
     * 
     * @example
     * const white = { r: 255, g: 255, b: 255 };
     * const gray = { r: 200, g: 200, b: 200 };
     * isColorSimilar(white, gray, 10);  // false
     * isColorSimilar(white, gray, 50);  // true
     */
    function isColorSimilar(target, actual, tolerancePercent) {
        const tolerance = tolerancePercent * 2.55; // Convert percentage 0-100 to 0-255 range
        const dr = target.r - actual.r;
        const dg = target.g - actual.g;
        const db = target.b - actual.b;
        return (dr*dr + dg*dg + db*db) <= (tolerance*tolerance);
    }
});
