document.addEventListener('DOMContentLoaded', function() {
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
    const contrastSlider = document.getElementById('contrast'); // Added
    const contrastValue = document.getElementById('contrastValue'); // Added
    const maskCanvas = document.getElementById('maskPreview');
    const maskCtx = maskCanvas.getContext('2d');

    // Filter buttons
    const filterNoneBtn = document.getElementById('filterNone');
    const filterGrayscaleBtn = document.getElementById('filterGrayscale');
    const filterSepiaBtn = document.getElementById('filterSepia');
    let currentFilter = 'none'; // To store the currently active filter

    let cropper;
    let currentFile;
    let originalImage = null; // Store the original image data for reapplying filters
    let originalWidth = 0;
    let originalHeight = 0;
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

    // --- Core Functions ---
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
        contrastSlider.value = 100;
        contrastValue.textContent = '100%';
        maskCanvas.style.display = 'none'; // Hide mask initially
        setActiveFilter('none', true); // Reset to no filter and update UI
    }

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
            for (let i = 0; i < data.length; i += 4) {
                const pixelColor = { r: data[i], g: data[i+1], b: data[i+2] };
                if (isColorSimilar(targetColor, pixelColor, tolValue)) {
                    data[i+3] = 0; // Make matching pixels fully transparent
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
            for (let i = 0; i < dataForBgRemoval.length; i += 4) {
                const pixelColor = { r: dataForBgRemoval[i], g: dataForBgRemoval[i+1], b: dataForBgRemoval[i+2] };
                if (isColorSimilar(targetColor, pixelColor, tolValue)) {
                    dataForBgRemoval[i+3] = 0; // Set alpha to transparent
                    hasTransparentPixels = true;
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

    // --- Utility Functions ---
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    function isColorSimilar(target, actual, tolerancePercent) {
        const tolerance = tolerancePercent * 2.55; // Convert percentage 0-100 to 0-255 range
        const dr = target.r - actual.r;
        const dg = target.g - actual.g;
        const db = target.b - actual.b;
        return (dr*dr + dg*dg + db*db) <= (tolerance*tolerance);
    }
});
