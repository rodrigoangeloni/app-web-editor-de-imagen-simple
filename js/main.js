/**
 * @fileoverview Editor de Imágenes Web - Lógica Principal
 * @description Aplicación de edición de imágenes en cliente usando Canvas API,
 *              Cropper.js para recorte, Compressor.js para optimización y
 *              FileSaver.js para descarga.
 * @author Rodrigo Angeloni
 * @version 2.0.0
 * @license MIT
 */

document.addEventListener('DOMContentLoaded', function () {
    // ==================== CONFIGURACIÓN ====================

    const CONFIG = {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        DEBOUNCE_DELAY: 100, // ms
        HISTORY_LIMIT: 20,
        TOAST_DURATION: 3000 // ms
    };

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
    const contrastSlider = document.getElementById('contrast');
    const contrastValue = document.getElementById('contrastValue');
    const brightnessSlider = document.getElementById('brightness');
    const brightnessValue = document.getElementById('brightnessValue');
    const saturationSlider = document.getElementById('saturation');
    const saturationValue = document.getElementById('saturationValue');
    const maskCanvas = document.getElementById('maskPreview');
    const maskCtx = maskCanvas.getContext('2d');

    // Nuevos elementos UI
    const toastContainer = document.getElementById('toastContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const imageInfo = document.getElementById('imageInfo');
    const infoDimensions = document.getElementById('infoDimensions');
    const infoSize = document.getElementById('infoSize');
    const infoFormat = document.getElementById('infoFormat');

    // Botones de rotación
    const rotateLeftBtn = document.getElementById('rotateLeft');
    const rotateRightBtn = document.getElementById('rotateRight');
    const flipHBtn = document.getElementById('flipH');
    const flipVBtn = document.getElementById('flipV');

    // Botones de acción
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const compareBtn = document.getElementById('compareBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Filter buttons
    const filterNoneBtn = document.getElementById('filterNone');
    const filterGrayscaleBtn = document.getElementById('filterGrayscale');
    const filterSepiaBtn = document.getElementById('filterSepia');
    const filterInvertBtn = document.getElementById('filterInvert');

    /** @type {string} Filtro actualmente activo: 'none' | 'grayscale' | 'sepia' | 'invert' */
    let currentFilter = 'none';

    /** @type {Cropper|null} Instancia de Cropper.js para recorte interactivo */
    let cropper;

    /** @type {File|null} Archivo de imagen original seleccionado por el usuario */
    let currentFile;

    /** @type {ImageData|null} Backup del ImageData original sin procesar */
    let originalImage = null;

    /** @type {number} Ancho natural de la imagen original en píxeles */
    let originalWidth = 0;

    /** @type {number} Alto natural de la imagen original en píxeles */
    let originalHeight = 0;

    /** @type {number} Relación de aspecto original (width / height) */
    let originalAspectRatio = 1;

    /** @type {number} Escala horizontal (1 o -1 para volteo) */
    let scaleX = 1;

    /** @type {number} Escala vertical (1 o -1 para volteo) */
    let scaleY = 1;

    /** @type {number} Timeout ID para debounce */
    let debounceTimer = null;

    /** @type {Array} Historial de estados para undo */
    let historyStack = [];

    /** @type {number} Índice actual en el historial */
    let historyIndex = -1;

    /** @type {boolean} Flag para evitar guardar estado durante undo/redo */
    let isUndoRedo = false;

    // ==================== UTILIDADES UI ====================

    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {'success'|'error'|'warning'|'info'} type - Tipo de notificación
     */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, CONFIG.TOAST_DURATION);
    }

    /**
     * Muestra/oculta el overlay de carga
     * @param {boolean} show - Mostrar u ocultar
     * @param {string} text - Texto a mostrar
     */
    function setLoading(show, text = 'Procesando...') {
        loadingText.textContent = text;
        loadingOverlay.classList.toggle('hidden', !show);
    }

    /**
     * Actualiza la información de la imagen
     */
    function updateImageInfo() {
        if (!currentFile || !cropper) {
            imageInfo.classList.add('hidden');
            return;
        }

        const cropData = cropper.getData(true);
        infoDimensions.textContent = `${cropData.width} × ${cropData.height} px`;
        infoSize.textContent = formatFileSize(currentFile.size);
        infoFormat.textContent = currentFile.type.split('/')[1]?.toUpperCase() || 'Unknown';
        imageInfo.classList.remove('hidden');
    }

    /**
     * Formatea el tamaño de archivo en unidades legibles
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} Tamaño formateado
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Habilita/deshabilita los controles que requieren imagen
     * @param {boolean} enabled - Estado de habilitación
     */
    function setControlsEnabled(enabled) {
        const controls = [
            downloadBtn, rotateLeftBtn, rotateRightBtn, flipHBtn, flipVBtn,
            compareBtn, resetBtn
        ];
        controls.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
        updateHistoryButtons();
    }

    /**
     * Actualiza el estado de los botones de historial
     */
    function updateHistoryButtons() {
        if (undoBtn) undoBtn.disabled = historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }

    // ==================== SISTEMA DE HISTORIAL ====================

    /**
     * Guarda el estado actual en el historial
     */
    function saveState() {
        if (isUndoRedo || !cropper) return;

        const state = {
            filter: currentFilter,
            contrast: contrastSlider.value,
            brightness: brightnessSlider.value,
            saturation: saturationSlider.value,
            bgColor: bgColorInput.value,
            tolerance: toleranceInput.value,
            edgesOnly: edgesOnlyCheckbox.checked,
            scaleX: scaleX,
            scaleY: scaleY,
            cropData: cropper.getData(),
            quality: qualitySlider.value,
            format: formatSelect.value,
            width: widthInput.value,
            height: heightInput.value,
            percent: percentInput.value,
            keepAspect: keepAspect.checked
        };

        // Eliminar estados futuros si estamos en medio del historial
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }

        historyStack.push(state);

        // Limitar tamaño del historial
        if (historyStack.length > CONFIG.HISTORY_LIMIT) {
            historyStack.shift();
        } else {
            historyIndex++;
        }

        updateHistoryButtons();
    }

    /**
     * Restaura un estado del historial
     * @param {Object} state - Estado a restaurar
     */
    function restoreState(state) {
        isUndoRedo = true;

        currentFilter = state.filter;
        contrastSlider.value = state.contrast;
        contrastValue.textContent = `${state.contrast}%`;
        brightnessSlider.value = state.brightness;
        brightnessValue.textContent = `${state.brightness}%`;
        saturationSlider.value = state.saturation;
        saturationValue.textContent = `${state.saturation}%`;
        bgColorInput.value = state.bgColor;
        toleranceInput.value = state.tolerance;
        toleranceValue.textContent = `${state.tolerance}%`;
        edgesOnlyCheckbox.checked = state.edgesOnly;
        scaleX = state.scaleX;
        scaleY = state.scaleY;
        qualitySlider.value = state.quality;
        qualityValue.textContent = `${state.quality}%`;
        formatSelect.value = state.format;
        widthInput.value = state.width;
        heightInput.value = state.height;
        percentInput.value = state.percent;
        keepAspect.checked = state.keepAspect;

        // Actualizar botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        if (state.filter === 'none') filterNoneBtn.classList.add('active');
        else if (state.filter === 'grayscale') filterGrayscaleBtn.classList.add('active');
        else if (state.filter === 'sepia') filterSepiaBtn.classList.add('active');
        else if (state.filter === 'invert') filterInvertBtn.classList.add('active');

        // Restaurar crop y escala
        if (cropper) {
            cropper.setData(state.cropData);
            cropper.scaleX(scaleX);
            cropper.scaleY(scaleY);
        }

        applyTransformations();
        isUndoRedo = false;
    }

    /**
     * Deshace el último cambio
     */
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState(historyStack[historyIndex]);
            updateHistoryButtons();
            showToast('Cambio deshecho', 'info');
        }
    }

    /**
     * Rehace el último cambio deshecho
     */
    function redo() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            restoreState(historyStack[historyIndex]);
            updateHistoryButtons();
            showToast('Cambio rehecho', 'info');
        }
    }

    // ==================== DEBOUNCE ====================

    /**
     * Aplica debounce a una función
     * @param {Function} func - Función a ejecutar
     * @param {number} delay - Delay en ms
     */
    function debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    }

    /**
     * Wrapper para applyTransformations con debounce
     */
    function debouncedApplyTransformations() {
        debounce(() => {
            applyTransformations();
            saveState();
        });
    }

    // ==================== EVENT LISTENERS ====================

    // Obtener referencia al contenedor de imagen
    const imageContainer = document.querySelector('.image-container');

    // Función reutilizable para manejar drag & drop
    function setupDragAndDrop(element) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
        });

        element.addEventListener('dragleave', (e) => {
            // Solo remover si realmente salimos del elemento (no de un hijo)
            if (e.target === element) {
                element.classList.remove('dragover');
            }
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    }

    // Aplicar drag & drop a la zona de upload original
    setupDragAndDrop(dropZone);

    // MEJORA UX: También permitir drag & drop en el contenedor grande de imagen
    setupDragAndDrop(imageContainer);

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
        debouncedApplyTransformations();
    });

    bgColorInput.addEventListener('input', () => {
        debouncedApplyTransformations();
    });

    edgesOnlyCheckbox.addEventListener('change', () => {
        debouncedApplyTransformations();
    });

    contrastSlider.addEventListener('input', () => {
        contrastValue.textContent = `${contrastSlider.value}%`;
        debouncedApplyTransformations();
    });

    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = `${brightnessSlider.value}%`;
        debouncedApplyTransformations();
    });

    saturationSlider.addEventListener('input', () => {
        saturationValue.textContent = `${saturationSlider.value}%`;
        debouncedApplyTransformations();
    });

    // Filter button event listeners
    filterNoneBtn.addEventListener('click', () => setActiveFilter('none'));
    filterGrayscaleBtn.addEventListener('click', () => setActiveFilter('grayscale'));
    filterSepiaBtn.addEventListener('click', () => setActiveFilter('sepia'));
    filterInvertBtn.addEventListener('click', () => setActiveFilter('invert'));

    // Rotation controls
    rotateLeftBtn.addEventListener('click', () => rotate(-90));
    rotateRightBtn.addEventListener('click', () => rotate(90));
    flipHBtn.addEventListener('click', () => flip('horizontal'));
    flipVBtn.addEventListener('click', () => flip('vertical'));

    // History controls
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    // Compare button (hold to compare)
    compareBtn.addEventListener('mousedown', showOriginal);
    compareBtn.addEventListener('mouseup', hideOriginal);
    compareBtn.addEventListener('mouseleave', hideOriginal);
    compareBtn.addEventListener('touchstart', showOriginal);
    compareBtn.addEventListener('touchend', hideOriginal);

    // Reset button
    resetBtn.addEventListener('click', resetAllChanges);

    // Handle dimension inputs
    widthInput.addEventListener('input', () => {
        updateDimensions();
        debouncedApplyTransformations();
    });

    heightInput.addEventListener('input', () => {
        updateDimensions();
        debouncedApplyTransformations();
    });

    keepAspect.addEventListener('change', () => {
        updateDimensions();
        debouncedApplyTransformations();
    });

    percentInput.addEventListener('input', () => {
        updateDimensions();
        debouncedApplyTransformations();
    });

    // Handle download button click
    downloadBtn.addEventListener('click', processAndDownload);

    // ==================== ATAJOS DE TECLADO ====================

    document.addEventListener('keydown', (e) => {
        // Ctrl+S - Descargar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (!downloadBtn.disabled) processAndDownload();
        }
        // Ctrl+Z - Deshacer
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        // Ctrl+Y o Ctrl+Shift+Z - Rehacer
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            redo();
        }
        // Escape - Resetear
        if (e.key === 'Escape' && !resetBtn.disabled) {
            resetAllChanges();
        }
        // Ctrl+Arrow - Rotar
        if (e.ctrlKey && e.key === 'ArrowLeft' && !rotateLeftBtn.disabled) {
            e.preventDefault();
            rotate(-90);
        }
        if (e.ctrlKey && e.key === 'ArrowRight' && !rotateRightBtn.disabled) {
            e.preventDefault();
            rotate(90);
        }
    });

    // ==================== FUNCIONES PRINCIPALES ====================

    /**
     * Procesa el archivo de imagen seleccionado por el usuario.
     * Valida tipo y tamaño, carga la imagen con FileReader, e inicializa Cropper.js.
     * 
     * @param {File} file - Objeto File del navegador (desde input o drag-drop)
     * @returns {void}
     */
    function handleFileSelect(file) {
        if (!file.type.match('image.*')) {
            showToast('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            showToast('El archivo es demasiado grande (máximo 10MB)', 'error');
            return;
        }

        setLoading(true, 'Cargando imagen...');
        currentFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block'; // Mostrar imagen cuando se carga
            imagePreview.onload = function () {
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

                // Reset flip state
                scaleX = 1;
                scaleY = 1;

                cropper = new Cropper(imagePreview, {
                    viewMode: 1,
                    autoCropArea: 1,
                    responsive: true,
                    ready: function () {
                        setLoading(false);
                        setControlsEnabled(true);
                        updateImageInfo();
                        applyTransformations();

                        // Inicializar historial
                        historyStack = [];
                        historyIndex = -1;
                        saveState();

                        showToast('Imagen cargada correctamente', 'success');
                    },
                    crop: function () {
                        updateImageInfo();
                        debouncedApplyTransformations();
                    }
                });
                resetControls();
            };
        };
        reader.onerror = function () {
            setLoading(false);
            showToast('Error al leer el archivo', 'error');
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
        brightnessSlider.value = 100;
        brightnessValue.textContent = '100%';
        saturationSlider.value = 100;
        saturationValue.textContent = '100%';
        maskCanvas.style.display = 'none';
        setActiveFilter('none', true);
    }

    /**
     * Resetea todos los cambios a los valores originales
     */
    function resetAllChanges() {
        if (!cropper) return;

        resetControls();
        scaleX = 1;
        scaleY = 1;
        cropper.reset();
        cropper.scaleX(1);
        cropper.scaleY(1);
        applyTransformations();
        saveState();
        showToast('Cambios reseteados', 'info');
    }

    /**
     * Cambia el filtro activo y actualiza la UI.
     * 
     * @param {('none'|'grayscale'|'sepia'|'invert')} filterName - Nombre del filtro a activar
     * @param {boolean} [isReset=false] - Si es true, no dispara applyTransformations()
     * @returns {void}
     */
    function setActiveFilter(filterName, isReset = false) {
        currentFilter = filterName;
        // Update button active states
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        if (filterName === 'none') filterNoneBtn.classList.add('active');
        else if (filterName === 'grayscale') filterGrayscaleBtn.classList.add('active');
        else if (filterName === 'sepia') filterSepiaBtn.classList.add('active');
        else if (filterName === 'invert') filterInvertBtn.classList.add('active');

        if (!isReset) {
            applyTransformations();
            saveState();
        }
    }

    /**
     * Rota la imagen
     * @param {number} degrees - Grados a rotar (90 o -90)
     */
    function rotate(degrees) {
        if (!cropper) return;
        cropper.rotate(degrees);
        saveState();
        showToast(`Rotado ${degrees > 0 ? 'derecha' : 'izquierda'}`, 'info');
    }

    /**
     * Voltea la imagen horizontal o verticalmente
     * @param {'horizontal'|'vertical'} direction - Dirección del volteo
     */
    function flip(direction) {
        if (!cropper) return;

        if (direction === 'horizontal') {
            scaleX = scaleX * -1;
            cropper.scaleX(scaleX);
        } else {
            scaleY = scaleY * -1;
            cropper.scaleY(scaleY);
        }

        saveState();
        showToast(`Volteado ${direction === 'horizontal' ? 'horizontalmente' : 'verticalmente'}`, 'info');
    }

    /**
     * Muestra la imagen original (para comparación)
     */
    function showOriginal() {
        if (maskCanvas) {
            maskCanvas.style.display = 'none';
        }
    }

    /**
     * Oculta la imagen original (vuelve a mostrar ediciones)
     */
    function hideOriginal() {
        if (maskCanvas && cropper) {
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
     * Crea un canvas temporal, procesa píxeles (brillo, contraste, saturación, filtros, bg removal)
     * y renderiza el preview en maskCanvas superpuesto sobre la imagen.
     * 
     * @returns {void}
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

        // 1. Apply brightness
        const brightnessLevel = parseFloat(brightnessSlider.value) / 100;

        // 2. Apply contrast
        const contrastLevel = parseFloat(contrastSlider.value);
        const contrastFactor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel));

        // 3. Apply saturation
        const saturationLevel = parseFloat(saturationSlider.value) / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Brightness
            r *= brightnessLevel;
            g *= brightnessLevel;
            b *= brightnessLevel;

            // Contrast
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            // Saturation
            const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
            r = gray + saturationLevel * (r - gray);
            g = gray + saturationLevel * (g - gray);
            b = gray + saturationLevel * (b - gray);

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        // 4. Apply Filters
        if (currentFilter === 'grayscale') {
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
            }
        } else if (currentFilter === 'sepia') {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
        } else if (currentFilter === 'invert') {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
        }

        // 5. Apply Background Removal preview
        const targetColor = hexToRgb(bgColorInput.value);
        const tolValue = parseInt(toleranceInput.value);

        if (bgColorInput.value !== '#ffffff' || tolValue > 0) {
            if (edgesOnlyCheckbox.checked) {
                removeBackgroundFromEdges(imageData, targetColor, tolValue);
            } else {
                for (let i = 0; i < data.length; i += 4) {
                    const pixelColor = { r: data[i], g: data[i + 1], b: data[i + 2] };
                    if (isColorSimilar(targetColor, pixelColor, tolValue)) {
                        data[i + 3] = 0;
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
        maskCanvas.style.zIndex = '10';

        // Clear and draw the processed image to the mask canvas
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.drawImage(workingCanvas, 0, 0, maskCanvas.width, maskCanvas.height);
    }

    /**
     * Procesa la imagen final con todas las transformaciones y la descarga.
     * 
     * @returns {void}
     */
    function processAndDownload() {
        if (!currentFile || !cropper || !cropper.ready) {
            showToast('Por favor sube una imagen primero', 'warning');
            return;
        }

        setLoading(true, 'Procesando imagen...');

        // Usar setTimeout para permitir que el UI se actualice
        setTimeout(() => {
            try {
                let canvasToDownload = cropper.getCroppedCanvas();
                if (!canvasToDownload) {
                    setLoading(false);
                    showToast('Error al procesar la imagen', 'error');
                    return;
                }

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

                const ctx = canvasToDownload.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
                const data = imageData.data;

                // 2. Apply brightness, contrast, saturation
                const brightnessLevel = parseFloat(brightnessSlider.value) / 100;
                const contrastLevel = parseFloat(contrastSlider.value);
                const contrastFactor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel));
                const saturationLevel = parseFloat(saturationSlider.value) / 100;

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i + 1];
                    let b = data[i + 2];

                    // Brightness
                    r *= brightnessLevel;
                    g *= brightnessLevel;
                    b *= brightnessLevel;

                    // Contrast
                    r = contrastFactor * (r - 128) + 128;
                    g = contrastFactor * (g - 128) + 128;
                    b = contrastFactor * (b - 128) + 128;

                    // Saturation
                    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
                    r = gray + saturationLevel * (r - gray);
                    g = gray + saturationLevel * (g - gray);
                    b = gray + saturationLevel * (b - gray);

                    data[i] = Math.max(0, Math.min(255, r));
                    data[i + 1] = Math.max(0, Math.min(255, g));
                    data[i + 2] = Math.max(0, Math.min(255, b));
                }
                ctx.putImageData(imageData, 0, 0);

                // 3. Apply Filters (final download)
                if (currentFilter === 'grayscale') {
                    const imgDataForFilter = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
                    const dataForFilter = imgDataForFilter.data;
                    for (let i = 0; i < dataForFilter.length; i += 4) {
                        const avg = (dataForFilter[i] + dataForFilter[i + 1] + dataForFilter[i + 2]) / 3;
                        dataForFilter[i] = avg;
                        dataForFilter[i + 1] = avg;
                        dataForFilter[i + 2] = avg;
                    }
                    ctx.putImageData(imgDataForFilter, 0, 0);
                } else if (currentFilter === 'sepia') {
                    const imgDataForFilter = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
                    const dataForFilter = imgDataForFilter.data;
                    for (let i = 0; i < dataForFilter.length; i += 4) {
                        const r = dataForFilter[i];
                        const g = dataForFilter[i + 1];
                        const b = dataForFilter[i + 2];
                        dataForFilter[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                        dataForFilter[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                        dataForFilter[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                    }
                    ctx.putImageData(imgDataForFilter, 0, 0);
                } else if (currentFilter === 'invert') {
                    const imgDataForFilter = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
                    const dataForFilter = imgDataForFilter.data;
                    for (let i = 0; i < dataForFilter.length; i += 4) {
                        dataForFilter[i] = 255 - dataForFilter[i];
                        dataForFilter[i + 1] = 255 - dataForFilter[i + 1];
                        dataForFilter[i + 2] = 255 - dataForFilter[i + 2];
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
                        removeBackgroundFromEdges(imgDataForBgRemoval, targetColor, tolValue);
                        for (let i = 3; i < dataForBgRemoval.length; i += 4) {
                            if (dataForBgRemoval[i] === 0) {
                                hasTransparentPixels = true;
                                break;
                            }
                        }
                    } else {
                        for (let i = 0; i < dataForBgRemoval.length; i += 4) {
                            const pixelColor = { r: dataForBgRemoval[i], g: dataForBgRemoval[i + 1], b: dataForBgRemoval[i + 2] };
                            if (isColorSimilar(targetColor, pixelColor, tolValue)) {
                                dataForBgRemoval[i + 3] = 0;
                                hasTransparentPixels = true;
                            }
                        }
                    }

                    ctx.putImageData(imgDataForBgRemoval, 0, 0);
                    if (hasTransparentPixels) {
                        actualFormat = 'png';
                    }
                }

                // --- Compression and Download ---
                const mimeType = `image/${actualFormat}`;
                canvasToDownload.toBlob((blob) => {
                    if (!blob) {
                        setLoading(false);
                        showToast('Error al crear el archivo de imagen', 'error');
                        return;
                    }
                    new Compressor(blob, {
                        quality: qualitySlider.value / 100,
                        mimeType: mimeType,
                        success(result) {
                            setLoading(false);
                            saveAs(result, `edited_image.${actualFormat}`);
                            showToast(`Imagen descargada (${formatFileSize(result.size)})`, 'success');
                        },
                        error(err) {
                            setLoading(false);
                            console.error(err.message);
                            showToast('Error al comprimir la imagen: ' + err.message, 'error');
                        }
                    });
                }, mimeType);
            } catch (error) {
                setLoading(false);
                console.error(error);
                showToast('Error inesperado al procesar la imagen', 'error');
            }
        }, 50);
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
        return (dr * dr + dg * dg + db * db) <= (tolerance * tolerance);
    }
});
