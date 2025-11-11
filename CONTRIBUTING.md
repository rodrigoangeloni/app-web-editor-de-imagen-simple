# Guía de Contribución - Editor de Imágenes Web

¡Gracias por tu interés en contribuir al Editor de Imágenes Web! Este documento te guiará para hacer contribuciones efectivas al proyecto.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Convenciones de Código](#convenciones-de-código)
- [Guías de Implementación](#guías-de-implementación)
- [Testing](#testing)
- [Proceso de Pull Request](#proceso-de-pull-request)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta simple:

- **Sé respetuoso:** Trata a todos con respeto y consideración
- **Sé constructivo:** Proporciona feedback útil y específico
- **Sé colaborativo:** Trabaja junto a otros para mejorar el proyecto
- **Sé paciente:** No todos tienen el mismo nivel de experiencia

---

## 🤝 Cómo Contribuir

### Reportar Bugs

Si encuentras un bug, por favor abre un **Issue** con la siguiente información:

```markdown
**Descripción del bug:**
Descripción clara y concisa del problema.

**Pasos para reproducir:**
1. Ve a '...'
2. Haz clic en '....'
3. Observa el error

**Comportamiento esperado:**
Qué esperabas que sucediera.

**Screenshots:**
Si aplica, agrega capturas de pantalla.

**Entorno:**
- Navegador: [ej: Chrome 120]
- OS: [ej: Windows 11]
- Resolución de imagen: [ej: 4000x4000]
```

### Sugerir Mejoras

Para proponer nuevas características, abre un **Issue** con:

```markdown
**Problema a resolver:**
¿Qué necesidad o problema resuelve esta feature?

**Solución propuesta:**
Describe cómo funcionaría.

**Alternativas consideradas:**
¿Qué otras soluciones has considerado?

**Contexto adicional:**
Cualquier otra información relevante.
```

### Contribuir Código

1. **Fork** el repositorio
2. **Crea una rama** para tu feature:
   ```bash
   git checkout -b feature/nombre-descriptivo
   ```
3. **Haz tus cambios** siguiendo las convenciones
4. **Commit** con mensajes descriptivos
5. **Push** a tu fork
6. **Abre un Pull Request**

---

## 💻 Convenciones de Código

### JavaScript

#### Nomenclatura

```javascript
// Variables y funciones: camelCase
let currentFilter = 'none';
function handleFileSelect(file) { ... }

// Constantes: camelCase (no UPPER_CASE en este proyecto)
const maxFileSize = 10 * 1024 * 1024;

// Clases (si se agregan en futuro): PascalCase
class ImageProcessor { ... }
```

#### Formato

```javascript
// Espaciado consistente
function myFunction(param1, param2) {  // Espacio antes de {
    if (condition) {                   // Espacio antes de (
        // código
    }
}

// Preferir const/let sobre var
const fixedValue = 100;
let variableValue = 0;

// Usar template literals para strings dinámicos
console.log(`Valor actual: ${value}`);  // ✅
console.log('Valor actual: ' + value);  // ❌
```

#### Comentarios

```javascript
// Comentarios JSDoc para funciones públicas
/**
 * Descripción de la función.
 * 
 * @param {Type} paramName - Descripción del parámetro
 * @returns {Type} Descripción del retorno
 */
function myFunction(paramName) { ... }

// Comentarios inline para lógica compleja
// Calcular factor de contraste usando fórmula estándar
const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

// Evitar comentarios obvios
let width = 100;  // ❌ Set width to 100
```

### CSS

#### Nomenclatura

```css
/* Clases: kebab-case */
.editor-container { }
.image-preview { }

/* BEM-like cuando sea apropiado */
.filter-btn { }
.filter-btn--active { }
```

#### Organización

```css
/* Propiedades en orden lógico */
.element {
    /* Posicionamiento */
    position: absolute;
    top: 0;
    left: 0;
    
    /* Box model */
    display: flex;
    width: 100%;
    padding: 10px;
    margin: 0;
    
    /* Tipografía */
    font-size: 16px;
    color: #333;
    
    /* Visual */
    background: white;
    border: 1px solid #ddd;
    
    /* Otros */
    cursor: pointer;
    transition: all 0.3s;
}
```

### HTML

```html
<!-- IDs para JavaScript, clases para CSS -->
<div id="imageContainer" class="container">
    <img id="imagePreview" class="preview-image" alt="Image preview">
</div>

<!-- Indentación de 4 espacios -->
<div class="outer">
    <div class="inner">
        <span>Content</span>
    </div>
</div>

<!-- Atributos en orden lógico: id, class, data-*, otros -->
<button id="downloadBtn" class="btn btn-primary" data-action="download">
```

---

## 🛠️ Guías de Implementación

### Agregar un Nuevo Filtro

**Paso 1: HTML** - Agregar botón

```html
<!-- En index.html, dentro de .filter-controls -->
<button id="filterInvert" class="filter-btn">Invertir</button>
```

**Paso 2: JavaScript** - Registrar event listener

```javascript
// En main.js, con los otros event listeners de filtros
document.getElementById('filterInvert').addEventListener('click', () => 
    setActiveFilter('invert')
);
```

**Paso 3: JavaScript** - Implementar lógica en `applyTransformations()`

```javascript
// Dentro del bucle de filtros
if (currentFilter === 'invert') {
    for (let i = 0; i < data.length; i += 4) {
        data[i]   = 255 - data[i];     // Red invertido
        data[i+1] = 255 - data[i+1];   // Green invertido
        data[i+2] = 255 - data[i+2];   // Blue invertido
        // data[i+3] alpha sin cambios
    }
}
```

**Paso 4: JavaScript** - Duplicar lógica en `processAndDownload()`

```javascript
// Buscar el bloque de filtros en processAndDownload()
// y agregar el mismo código
if (currentFilter === 'invert') {
    const imgDataForFilter = ctx.getImageData(0, 0, canvasToDownload.width, canvasToDownload.height);
    const dataForFilter = imgDataForFilter.data;
    for (let i = 0; i < dataForFilter.length; i += 4) {
        dataForFilter[i]   = 255 - dataForFilter[i];
        dataForFilter[i+1] = 255 - dataForFilter[i+1];
        dataForFilter[i+2] = 255 - dataForFilter[i+2];
    }
    ctx.putImageData(imgDataForFilter, 0, 0);
}
```

**Paso 5: CSS** - Estilizar botón (si es necesario)

```css
/* En style.css, ya existe .filter-btn genérico, pero puedes personalizar: */
#filterInvert {
    /* Estilos específicos si son necesarios */
}
```

**Paso 6: Documentación** - Actualizar README.md

```markdown
## Características

* **Filtros de Imagen:**
    * Escala de Grises
    * Sepia
    * Invertir (nuevo)
```

### Agregar un Control de Slider

**Ejemplo: Agregar control de brillo**

```html
<!-- HTML -->
<div class="control-group">
    <label for="brightness">Brillo:</label>
    <input type="range" id="brightness" min="0" max="200" value="100">
    <span id="brightnessValue">100%</span>
</div>
```

```javascript
// JavaScript - Event listener
const brightnessSlider = document.getElementById('brightness');
const brightnessValue = document.getElementById('brightnessValue');

brightnessSlider.addEventListener('input', () => {
    brightnessValue.textContent = `${brightnessSlider.value}%`;
    applyTransformations();
});

// En applyTransformations(), después del contraste:
const brightnessLevel = parseFloat(brightnessSlider.value);
const brightnessFactor = brightnessLevel / 100;

for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.min(255, data[i]   * brightnessFactor);
    data[i+1] = Math.min(255, data[i+1] * brightnessFactor);
    data[i+2] = Math.min(255, data[i+2] * brightnessFactor);
}
```

### Optimizar Rendimiento

**Problema:** Procesamiento píxel a píxel es lento en imágenes grandes

**Solución 1: Web Workers** (recomendado para features futuras)

```javascript
// Crear worker.js
self.onmessage = function(e) {
    const { imageData, filter } = e.data;
    // Procesar imageData
    const processedData = applyFilter(imageData, filter);
    self.postMessage({ processedData });
};

// En main.js
const worker = new Worker('js/worker.js');
worker.postMessage({ imageData, filter: currentFilter });
worker.onmessage = (e) => {
    ctx.putImageData(e.data.processedData, 0, 0);
};
```

**Solución 2: Throttling para eventos**

```javascript
// Limitar frecuencia de applyTransformations() en sliders
let transformTimeout;
contrastSlider.addEventListener('input', () => {
    clearTimeout(transformTimeout);
    transformTimeout = setTimeout(() => {
        applyTransformations();
    }, 100); // 100ms de debounce
});
```

---

## 🧪 Testing

### Testing Manual

Antes de enviar un PR, prueba tu código con:

**Casos de prueba básicos:**
1. Cargar imagen pequeña (< 1MB, < 1000x1000)
2. Cargar imagen mediana (2-5MB, 2000x2000)
3. Cargar imagen grande (8-10MB, 4000x4000)
4. Intentar cargar archivo no-imagen (debe rechazar)
5. Intentar cargar archivo > 10MB (debe rechazar)

**Casos de prueba de features:**
1. Aplicar cada filtro individualmente
2. Ajustar contraste a 0, 100, 200
3. Probar eliminación de fondo con diferentes colores y tolerancias
4. Redimensionar manteniendo y sin mantener relación de aspecto
5. Descargar en cada formato (JPEG, PNG, WEBP)

**Navegadores a probar:**
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (si tienes acceso a Mac/iOS)

**Dispositivos:**
- Desktop (mouse)
- Tablet (touch)
- Mobile (touch, viewport pequeño)

### Testing Automatizado (Futuro)

Si implementas tests, usar:

```javascript
// jest.config.js (para unit tests)
module.exports = {
    testEnvironment: 'jsdom',
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80
        }
    }
};

// Ejemplo de test
describe('hexToRgb', () => {
    it('convierte blanco correctamente', () => {
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
});
```

---

## 📥 Proceso de Pull Request

### Antes de Enviar

**Checklist:**
- [ ] Código sigue convenciones del proyecto
- [ ] Funcionalidad probada manualmente
- [ ] No hay errores en consola del navegador
- [ ] Documentación actualizada (README, comentarios)
- [ ] Commit messages son descriptivos
- [ ] Branch está actualizado con `main`

### Commits

**Formato recomendado:**

```
tipo(ámbito): descripción corta

Descripción más detallada si es necesario.
Explica el "por qué" no el "qué".

Fixes #123
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Solo cambios en documentación
- `style`: Formato, espaciado (sin cambios de lógica)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Agregar o corregir tests

**Ejemplos:**

```bash
feat(filters): agregar filtro de inversión de colores

Implementa un nuevo filtro que invierte los valores RGB
de cada píxel, creando un efecto de negativo.

Fixes #42
```

```bash
fix(crop): corregir posicionamiento de maskCanvas en zoom

El canvas de preview no se posicionaba correctamente cuando
el usuario hacía zoom en la imagen. Ahora usa getCropBoxData()
para posicionamiento preciso.

Fixes #56
```

### Descripción del PR

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva feature (cambio que agrega funcionalidad)
- [ ] Breaking change (cambio que rompe compatibilidad)
- [ ] Mejora de performance
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas.

## Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He probado mi código manualmente
- [ ] He actualizado la documentación
- [ ] Mis commits tienen mensajes descriptivos
```

### Revisión

Tu PR será revisado considerando:

1. **Funcionalidad:** ¿Funciona como se espera?
2. **Calidad de código:** ¿Sigue convenciones?
3. **Performance:** ¿Impacta negativamente el rendimiento?
4. **Documentación:** ¿Está bien documentado?
5. **Testing:** ¿Se probó adecuadamente?

**Tiempos de respuesta:**
- Primera revisión: 1-3 días
- Feedback adicional: 1-2 días

---

## 🌟 Áreas que Necesitan Ayuda

### Prioridad Alta
- [ ] Implementar historial deshacer/rehacer
- [ ] Agregar rotación y volteo de imagen
- [ ] Más filtros (brillo, saturación, blur)
- [ ] Web Workers para procesamiento asíncrono

### Prioridad Media
- [ ] Testing automatizado (Jest + Playwright)
- [ ] WebGL para filtros más rápidos
- [ ] Eliminación de fondo con IA (ONNX)
- [ ] Modo batch para múltiples imágenes

### Prioridad Baja
- [ ] Internacionalización (i18n)
- [ ] Tema oscuro
- [ ] PWA / Service Worker
- [ ] Marcas de agua y texto

---

## 📚 Recursos Útiles

### Documentación de APIs
- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Cropper.js](https://github.com/fengyuanchen/cropperjs)
- [Compressor.js](https://github.com/fengyuanchen/compressorjs)
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/)

### Algoritmos de Procesamiento de Imágenes
- [Image Processing Algorithms - Wikipedia](https://en.wikipedia.org/wiki/Digital_image_processing)
- [Canvas Pixel Manipulation - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)

### Herramientas
- [Can I Use](https://caniuse.com/) - Compatibilidad de navegadores
- [BrowserStack](https://www.browserstack.com/) - Testing cross-browser

---

## ❓ Preguntas

Si tienes preguntas sobre contribuciones:

1. Revisa esta guía y el [README.md](README.md)
2. Revisa [Issues existentes](../../issues)
3. Abre un nuevo Issue con la etiqueta `question`

---

## 🎉 Reconocimientos

Todos los contribuidores serán reconocidos en el README.md.

¡Gracias por contribuir al proyecto! 🚀

---

**Autor:** Rodrigo Angeloni  
**Última actualización:** Noviembre 2025
