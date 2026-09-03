# AGENTS.md

Zero-build static site. No `package.json`, no bundler, no tests, no CI. Everything runs client-side.

## Stack & Entrypoints
- `index.html` — sole entry. Loads CDN libs (Cropper.js 1.5.12, Compressor.js 1.1.1, FileSaver.js 2.0.5) then `js/main.js`.
- `js/main.js` — all logic inside a `DOMContentLoaded` closure. Not ES modules; no `import`/`export` without refactoring the wrapper.
- `css/style.css` — dark theme via `:root` variables; sections delimited by `/* === SECTION === */`.
- `.github/copilot-instructions.md` — longer agent guide (patterns, history, shortcuts). Trust it over `README.md` prose on conflicts. Ignore its references to `ARCHITECTURE.md` / `API.md` / `CONTRIBUTING.md` — those files do not exist.

## Run Locally
No install. Serve over HTTP to avoid CORS/Canvas restrictions:
```powershell
python -m http.server 8000
# or
npx http-server -p 8000
```
Then `http://localhost:8000`. `file://` works but HTTP is preferred.

## Architecture Gotchas
- **Duplicated transform pipeline** — `applyTransformations()` is live preview (cropped canvas → `#maskPreview` overlay), `processAndDownload()` is final export. Both contain the same pixel logic (brightness/contrast/saturation, filters, bg removal). Every new filter/adjustment must be added to **both**; missing one silently breaks preview or download.
- **Preview overlay trick** — preview never replaces the image; it renders into `#maskPreview` positioned over the crop box. `showOriginal()`/`hideOriginal()` toggle visibility for A/B compare.
- **Synchronous pixel loops** — all `ImageData` work blocks the main thread. Guarded by `CONFIG.MAX_DIMENSION` (8000px) and `CONFIG.MAX_PIXELS` (~25MP); larger images are clamped/rejected to avoid OOM, but ~4000px+ still freezes UI briefly. Fix would be Web Workers, not implemented.
- **PNG forced on transparency** — `processAndDownload()` switches output to `png` if any alpha=0 after bg removal, regardless of `formatSelect`.
- **Background removal** — `removeBackgroundFromEdges()` is BFS flood-fill from the perimeter (4-connected). `#edgesOnly` checked by default = flood-fill; unchecked = global scan (legacy, destroys internal similar colors).
- **History/undo** — `historyStack`/`historyIndex`/`isUndoRedo` flag. Call `saveState()` after every user-visible change. `restoreState()` reads/writes every control; a new control requires updating `saveState`, `restoreState`, and `resetControls`. Limit `CONFIG.HISTORY_LIMIT = 20`.
- **Debounce** — `debouncedApplyTransformations()` (100ms via `CONFIG.DEBOUNCE_DELAY`) for sliders/inputs. Direct `applyTransformations()` only for init (`ready` callback) and `restoreState`.
- **State not on DOM** — `scaleX`/`scaleY` (flip), `currentFilter`, `currentFile`, `originalImage` live only in closure; persist them in history manually.

## Adding a New Filter
1. HTML: `<button id="filterNew" class="filter-btn" aria-pressed="false">` in the `index.html` filter group.
2. JS refs + listener (follow `filterInvertBtn` pattern: `setActiveFilter('new')`).
3. Add branch in `applyTransformations()` **and** `processAndDownload()`.
4. Update `setActiveFilter()` active-class / `aria-pressed` mapping.

## Adding a New Slider/Control
1. DOM ref at top of `js/main.js`.
2. `input` listener → update display span + `debouncedApplyTransformations()`.
3. Extend `saveState()` / `restoreState()` / `resetControls()`.
4. Apply effect in **both** transform functions.

## Conventions
- JS: `camelCase`, `CONFIG` limits (`MAX_FILE_SIZE: 10MB`, `MAX_DIMENSION: 8000`, `MAX_PIXELS: 25M`, `DEBOUNCE_DELAY: 100`, `TOAST_DURATION: 3000`). JSDoc `@param`/`@returns` on main functions.
- HTML: `id` for JS hooks, `class` for styling. Interactive controls need ARIA (`aria-label`, `aria-pressed` on toggles, `role="group"`).
- Icons: inline SVG in HTML (`aria-hidden="true"`, `stroke="currentColor"`) or data-URI SVG backgrounds in CSS. Never emoji as icons. Touch targets ≥44px; new CSS must honor `prefers-reduced-motion`.
- CSS: kebab-case, BEM-like where used. Breakpoints at `900px` (editor stack), `768px`/`480px` (mobile). New rules go in the correct `/* === === */` section.
- Commit prefix: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:` + scope, e.g. `feat(filtros): ...`.
- Utilities: `showToast(msg, 'success'|'error'|'warning'|'info')`, `setLoading(bool, text)`, `formatFileSize(bytes)`.

## Verification
No automated tests. Verify manually: varied sizes (100px–4000px, plus one oversize to hit the clamp), drag-drop + file input, each filter/control, undo/redo, rotate/flip, download per format, preview-vs-export match. Chrome/Firefox; console check for `Cropper is not defined` (CDN failure).
