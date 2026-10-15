# Changelog - Editor de Imágenes Web

Registro de cambios significativos en el proyecto.

---

## [2.1.0] - 2026-10-15

### ✨ Nuevas Funcionalidades

#### Aceleración GPU (WebGPU + WebGL2, con fallback CPU)
- Etapa de color (brillo/contraste/saturación + grises/sepia/invertir) en un único shader: WebGL2 síncrono para preview en tiempo real, WebGPU compute (WGSL) para export.
- Detección automática al arrancar: WebGPU > WebGL2 > CPU, con badge en el header (`GPU · WebGPU` / `GPU · WebGL2` / `CPU`).
- Misma matemática que el path CPU (verificado <1 LSB); preview y export ya no duplican lógica de color (`getFilterParams()` como fuente única).
- Nuevos archivos: `js/gpu.js` (motor), sin dependencias, zero-build intacto.

#### Pipeline en Web Worker
- Export de imágenes ≥500×500px procesado en `js/pipeline.worker.js` (color + fondo clásico fuera del hilo principal, buffer transferible).
- Timeout de 15 s con fallback automático a CPU; imágenes pequeñas siguen ruta síncrona (sin overhead).

#### Eliminación de fondo con IA local (beta)
- Botón "Quitar fondo con IA" (sección Fondo): MODNet (~26 MB, Apache-2.0) por defecto y RMBG-1.4 (~45 MB, licencia solo no-comercial) opcional, vía Transformers.js, inferencia 100% en el dispositivo (nada se sube).
- Lazy-load del runtime solo al primer clic; cap de inferencia a 1024 px (evita OOM en iGPU 2 GB); la máscara se re-aplica al mover sliders y se invalida al cambiar el recorte.
- Nuevo archivo: `js/ai-bg.js`. Integrado en historial (undo/redo) y reset.

#### Exportación AVIF
- Nuevo formato AVIF en el selector (ruta nativa `toBlob`, sin Compressor.js); PNG forzado si hay transparencia (también con máscara IA).

### ⚡ Mejoras
- Export: un solo escaneo de alfa decide el PNG forzado (cubre fondo clásico + IA).
- Toast informativo al cambiar de modelo IA o al invalidarse la máscara por recorte.

### 🐛 Correcciones
- **Preview de transparencia**: el fondo eliminado (clásico o IA) ahora se previsualiza sobre damero dentro de `#maskPreview`. Antes, los píxeles con alfa=0 dejaban ver el clon sin procesar de Cropper y parecía que no pasaba nada (la descarga siempre fue correcta).
- Palabra reservada WGSL (`filter` → `filterMode`): el shader WebGPU no compilaba y caía en silencio a CPU; ahora verifica `getCompilationInfo()`.
- Runtime IA: Transformers.js v2 no registra `modnet` y su dist no es UMD → migrado a v3 (`@huggingface/transformers`) con `AutoModel`/`AutoProcessor` directos y `import()` dinámico.

---

## [2.0.0] - 2025-12-03

### ✨ Nuevas Funcionalidades

#### Sistema de Notificaciones Toast
- Notificaciones visuales para feedback de acciones
- Tipos: success, error, warning, info
- Auto-desaparición configurable (3 segundos por defecto)

#### Indicador de Carga
- Overlay con spinner durante procesamiento
- Texto de estado personalizable
- Previene interacciones durante operaciones largas

#### Información de Imagen
- Muestra dimensiones (ancho × alto px)
- Muestra tamaño del archivo
- Muestra formato de imagen

#### Controles de Rotación y Volteo
- Rotar 90° izquierda / derecha
- Voltear horizontal / vertical
- Integración con Cropper.js

#### Nuevos Ajustes de Imagen
- **Brillo:** 0% - 200% (100% = normal)
- **Saturación:** 0% - 200% (100% = normal)
- Contraste mejorado con fórmula de factor

#### Filtro Invertir
- Nuevo filtro que invierte los colores de la imagen
- Aplicación píxel a píxel (255 - valor)

#### Sistema Undo/Redo
- Historial de hasta 20 estados (configurable)
- Stack de estados con todas las configuraciones
- Restauración completa de filtros, sliders, crop, etc.

#### Comparación A/B
- Botón "Comparar" (mantener presionado)
- Muestra imagen original vs. editada
- Soporta mouse y touch

#### Resetear Cambios
- Botón para volver al estado inicial
- Resetea todos los controles y transformaciones

#### Atajos de Teclado
| Atajo | Acción |
|-------|--------|
| `Ctrl+S` | Descargar imagen |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` | Rehacer |
| `Ctrl+Shift+Z` | Rehacer (alternativo) |
| `Escape` | Resetear cambios |
| `Ctrl+←` | Rotar 90° izquierda |
| `Ctrl+→` | Rotar 90° derecha |

### ⚡ Mejoras de Performance

#### Sistema de Debounce
- Delay configurable (100ms por defecto)
- Aplicado a todos los sliders
- Evita procesamiento excesivo durante arrastre

#### Configuración Centralizada
```javascript
CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
    DEBOUNCE_DELAY: 100,               // ms
    HISTORY_LIMIT: 20,                 // estados
    TOAST_DURATION: 3000               // ms
}
```

### ♿ Accesibilidad

#### Atributos ARIA Completos
- `role="group"` en grupos de botones
- `aria-label` en todos los controles
- `aria-pressed` en botones toggle (filtros)
- `aria-valuemin/max/now` en sliders
- `aria-live="polite"` en contenedor de toasts
- `role="dialog"` en overlay de carga

#### Tooltips Mejorados
- Todos los botones incluyen `title` descriptivo
- Atajos de teclado mostrados en tooltips

### 🎨 UI/UX

#### Nuevos Estilos CSS
- `.toast-container` y `.toast` con variantes
- `.loading-overlay` con `.spinner` animado
- `.image-info` para información de imagen
- `.rotation-controls` para botones de transformación
- `.icon-btn` para botones con iconos
- `.action-buttons` y `.history-controls`
- `.secondary-btn` con variante `.danger`

#### Estados de Botones
- Botones deshabilitados hasta cargar imagen
- Feedback visual de estado disabled
- Actualización dinámica de botones de historial

### 📝 Documentación

- Actualizado `.github/copilot-instructions.md` con nuevos patrones
- Actualizado `README.md` con todas las características
- Código documentado con JSDoc completo
- Comentarios de sección en CSS

### 🛠️ Cambios Técnicos

#### JavaScript
- Refactorizado a estructura modular con secciones
- Nuevas funciones utilitarias: `showToast()`, `setLoading()`, `formatFileSize()`
- Sistema de historial con `saveState()`, `restoreState()`, `undo()`, `redo()`
- Variables de estado: `scaleX`, `scaleY`, `historyStack`, `historyIndex`
- Procesamiento unificado de brillo/contraste/saturación

#### HTML
- Estructura semántica mejorada
- Nuevos elementos UI integrados
- Atributos de accesibilidad en todos los controles

#### CSS
- ~200 líneas de nuevos estilos
- Animaciones para toast y spinner
- Diseño responsive mantenido

**Archivos modificados:**
- `index.html` - Nueva estructura UI completa
- `js/main.js` - Refactorización mayor (~400 líneas nuevas)
- `css/style.css` - Nuevos estilos y componentes
- `.github/copilot-instructions.md` - Documentación actualizada
- `README.md` - Características y documentación actualizada
- `CHANGELOG.md` - Este registro

---

## [1.1.0] - 2025-11-11

### ✨ Agregado

#### Eliminación de Fondo Mejorada con Flood Fill

**Problema resuelto:**
- El algoritmo anterior eliminaba TODOS los píxeles similares al color objetivo en toda la imagen
- Ejemplo: Al eliminar fondo blanco, también eliminaba camisas blancas, dientes, ojos, etc.

**Nueva solución:**
- Algoritmo de **Flood Fill desde bordes** (BFS - Breadth First Search)
- Solo elimina píxeles del fondo conectados a los bordes de la imagen
- Preserva elementos internos aunque tengan colores similares al fondo

**Nuevo control UI:**
- Checkbox: **"Solo desde bordes (más preciso)"** 
  - ✅ Activado por defecto (recomendado)
  - Cuando está activado: Usa Flood Fill (preciso)
  - Cuando está desactivado: Usa algoritmo global (agresivo, legacy)

**Casos de uso ideales:**
- ✅ Fotos de productos con fondo uniforme
- ✅ Retratos de estudio con fondo sólido
- ✅ Documentos escaneados
- ✅ Imágenes con sujeto centrado

**Ventajas del nuevo algoritmo:**

| Aspecto | Antes (Global) | Ahora (Flood Fill) |
|---------|----------------|-------------------|
| Precisión | ❌ Baja | ✅ Alta |
| Falsos positivos | ❌ Muchos | ✅ Mínimos |
| Camisa blanca en fondo blanco | ❌ Eliminada | ✅ Preservada |
| Ojos/dientes en retratos | ❌ Eliminados | ✅ Preservados |
| Performance | O(n) | O(n) amortizado |

**Cómo funciona:**

```
Imagen original (fondo blanco):
┌─────────────────┐
│░░░░░░░░░░░░░░░░░│  ← Borde superior (blanco)
│░░░┌───────┐░░░░│
│░░░│       │░░░░│
│░░░│ 👤    │░░░░│  ← Sujeto con camisa blanca
│░░░│       │░░░░│
│░░░└───────┘░░░░│
│░░░░░░░░░░░░░░░░░│  ← Borde inferior (blanco)
└─────────────────┘

Después de Flood Fill:
┌─────────────────┐
│⬜⬜⬜⬜⬜⬜⬜⬜⬜│  ← Fondo transparente
│⬜⬜┌───────┐⬜⬜│
│⬜⬜│       │⬜⬜│
│⬜⬜│ 👤👕  │⬜⬜│  ← Camisa blanca PRESERVADA
│⬜⬜│       │⬜⬜│
│⬜⬜└───────┘⬜⬜│
│⬜⬜⬜⬜⬜⬜⬜⬜⬜│  ← Fondo transparente
└─────────────────┘

Leyenda:
░ = Fondo blanco (eliminado)
⬜ = Transparente
👤 = Sujeto (preservado)
👕 = Camisa blanca (preservada, aunque es blanca)
```

**Algoritmo técnico:**
```javascript
1. Escanear todos los píxeles del perímetro de la imagen
2. Si píxel del borde coincide con color objetivo:
   - Agregarlo a cola BFS
   - Marcarlo como "visitado"
3. Mientras la cola no esté vacía:
   - Sacar píxel de la cola
   - Hacerlo transparente (alpha = 0)
   - Para cada vecino 4-connected (↑↓←→):
     - Si no fue visitado Y coincide con color objetivo:
       - Agregarlo a la cola
       - Marcarlo como visitado
4. Resultado: Solo fondo conectado a bordes es eliminado
```

**Archivos modificados:**
- `index.html` - Agregado checkbox "Solo desde bordes"
- `js/main.js` - Implementada función `removeBackgroundFromEdges()`
- `js/main.js` - Actualizado `applyTransformations()` para usar nuevo algoritmo
- `js/main.js` - Actualizado `processAndDownload()` para usar nuevo algoritmo
- `css/style.css` - Documentado estilo de checkbox
- `README.md` - Documentada nueva funcionalidad
- `API.md` - Documentada función `removeBackgroundFromEdges()`
- `ARCHITECTURE.md` - Explicado nuevo algoritmo con comparación

**Testing recomendado:**
1. Cargar imagen con fondo blanco y sujeto con ropa blanca
2. Seleccionar color blanco (#ffffff)
3. Ajustar tolerancia a 10-20%
4. Verificar que:
   - ✅ Fondo es eliminado
   - ✅ Ropa/elementos blancos del sujeto se preservan
5. Desmarcar "Solo desde bordes" y verificar que:
   - ❌ Toda la ropa blanca también se elimina (comportamiento legacy)

**Limitaciones conocidas:**
- Si el sujeto toca los bordes de la imagen, puede ser afectado
- Asume que el fondo está en el perímetro
- No funciona con fondos multicolor complejos

**Próximas mejoras posibles:**
- Detección automática de color de fondo (sampling del perímetro)
- Edge detection (Sobel/Canny) para bordes más precisos
- Eliminación de fondo con IA (U2-Net, MODNet via ONNX)

---

## [1.0.0] - 2024-05-01

### ✨ Versión Inicial

- Carga de imágenes via drag-drop o file input
- Recorte interactivo con Cropper.js
- Redimensionado con mantenimiento de aspect ratio
- Ajuste de contraste
- Filtros: Grayscale, Sepia
- Eliminación de fondo básica (algoritmo global)
- Compresión y descarga en JPEG/PNG/WEBP
- Preview en tiempo real

---

**Formato del Changelog:**
- Basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
- Versionado Semántico: MAJOR.MINOR.PATCH
  - MAJOR: Cambios incompatibles con versión anterior
  - MINOR: Nueva funcionalidad compatible
  - PATCH: Correcciones de bugs

**Autor:** Rodrigo Angeloni  
**Última actualización:** 3 de diciembre de 2025
