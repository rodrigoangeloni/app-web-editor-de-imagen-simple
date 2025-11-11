# Changelog - Editor de Imágenes Web

Registro de cambios significativos en el proyecto.

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
**Última actualización:** 11 de noviembre de 2025
