# ADR-0002: Sección Services con Tabs (Magic Indicator) sobre Horizon

**Date:** 2026-04-25
**Author(s):** Miguel Soler
**Status:** Proposed

## Context

Segunda sección de la landing de Ornevo (después del hero). Presenta los pilares de servicio del estudio en formato **tab-pane** con **Magic Indicator** (background deslizante con destello radial) inspirado en la referencia de Dribbble (`landing/transicion/transicion_*.png` + video). Wireframes finales en `landing/slice_services_desktop.png` y `landing/slice_services_*_responsive.png`.

Spec de negocio en `landing/specs-services.md`. Resumen operativo:

- **Reutilizable** en plantillas: Inicio, Colección, Producto, Página, Blog → todos los settings deben ser **metafield-compatibles** (no `textarea`, `checkbox`, ni `range`).
- **ID administrable** para anclaje URL (`/#anchor`) respetando offset del header.
- **Máximo 4 tabs** (bloques repetidores).
- Cada tab tiene: número (icono SVG), label desktop (ej. "SEO"), título, descripción, imagen 1:1, y un **panel de detalle** con título, descripción y grid de servicios (máx **2 columnas × 4 filas = 8 items**, una columna en mobile). Cada item: icono SVG + texto + CTA opcional con estilo del DS y opción "abrir formulario contacto".
- En **desktop**: labels textuales (`SEO`, `Performance`, `Desarrollo`, `Soporte`).
- En **mobile**: solo números (`01`/`02`/`03`/`04`); navegación por **tap** y **swipe** horizontal entre paneles.
- Transición del menú: **píldora activa se desliza** sobre el contenedor con **destello radial** en el destino, replicando la referencia.
- Transición del panel: cross-fade suave + ligero translate (sin reflow).

El stack ya establecido (ADR-0001 + sección `orn-hero`) es:
- Alpine.js cargado vía `snippets/scripts.liquid` (orden: componentes → `alpine.min.js`).
- CSS y JS de cada sección viven en `assets/<nombre>.css` y `assets/<nombre>.js`, registrados en `snippets/stylesheets.liquid` y `snippets/scripts.liquid`.
- Convención de naming: prefijo `orn-` para secciones propias; bloques con `_orn-<seccion>-<bloque>.liquid`.
- Color schemes nativos del theme; botones vía `.ornevo-btn--primary|secondary|tertiary`.

## Decision drivers

- **Must:** todos los settings sobreviven el filtro de metafields (no `textarea`, `checkbox`, `range`).
- **Must:** un único bloque repetidor representa un tab; máximo 4.
- **Must:** Magic Indicator (píldora deslizante + flash radial) replicable con CSS transitions + transform — sin librería de animación externa.
- **Must:** swipe en mobile sin perder accesibilidad por teclado (arrow keys, Home/End).
- **Must:** patrón ARIA `tablist`/`tab`/`tabpanel` correcto con focus visible.
- **Must:** anchor scroll respeta altura del header sticky (variable `--header-height` o `scroll-margin-top`).
- **Should:** transiciones <300ms; `prefers-reduced-motion` desactiva el desliz/flash dejando un cambio instantáneo.
- **Should:** el panel inactivo no consume espacio (`display: none` tras la transición) para evitar layout shift.
- **Should:** el grid 2×4 colapsa a 1 columna ≤ `--breakpoint-md`.
- **Nice to have:** lazy-load de imágenes 1:1 de tabs no activos (solo la primera con `eager`).

## Decision

Creamos una sección reutilizable **`sections/orn-services.liquid`** + bloque **`blocks/_orn-services-tab.liquid`**, controlada por un componente Alpine **`ornServices`** en **`assets/orn-services.js`**, con estilos en **`assets/orn-services.css`**.

### 1. Estructura de archivos

```
sections/orn-services.liquid           # shell + tablist + nav + render de blocks
blocks/_orn-services-tab.liquid        # un tab/panel (datos + grid de items)
assets/orn-services.css                # layout, magic indicator, transiciones
assets/orn-services.js                 # Alpine component ornServices
snippets/orn-services-item.liquid      # render de un item del grid (icono + texto + CTA)
```

Registro:
- `snippets/stylesheets.liquid` → añadir `{{ 'orn-services.css' | asset_url | stylesheet_tag }}` debajo de `orn-hero.css`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-services.js' | asset_url }}" defer></script>` **antes** de `alpine.min.js` (mismo orden que `orn-hero.js`).

### 2. Schema de la sección (`orn-services`)

Settings de sección (todos metafield-safe):

| id | type | notas |
|----|------|-------|
| `anchor_id` | `text` | id del `<section>`; usado como `#anchor`. Default vacío → fallback a `section.id`. |
| `section_title` | `inline_richtext` | "Servicios" (H2). |
| `section_subtitle` | `inline_richtext` | "Un acompañamiento de principio a fin". |
| `cta_text` | `text` | Texto del CTA inferior ("Hablemos de tu proyecto"). |
| `cta_url` | `url` | Destino del CTA. |
| `cta_target` | `select` (`same` / `new` / `contact_form`) | Reemplaza el `checkbox` para cumplir metafields. `contact_form` abre modal/anchor a `#contact`. |
| `cta_variant` | `select` (`primary` / `secondary` / `tertiary`) | Estilo del DS. |
| `cta_icon_svg` | `image_picker` | SVG opcional como imagen (evita `textarea`). |
| `color_scheme` | `color_scheme` | Default `scheme-1`. |
| `enable_swipe_mobile` | `select` (`yes` / `no`) | Reemplaza `checkbox`. Default `yes`. |

`max_blocks: 4`. `presets` carga 4 tabs vacíos para que el editor los vea de entrada.

`enabled_on.templates: ["index","page","product","collection","blog","article"]` para reutilización.

### 3. Schema del bloque (`_orn-services-tab`)

Settings (metafield-safe):

| id | type | notas |
|----|------|-------|
| `tab_label_desktop` | `text` | "SEO", "Performance"… |
| `tab_number_icon` | `image_picker` | SVG `01`, `02`… (mobile y badge desktop). |
| `tab_title` | `inline_richtext` | Título grande izquierdo (Hn configurable). |
| `tab_heading_level` | `select` (`h2`/`h3`/`h4`) | Default `h3`. |
| `tab_description` | `richtext` | Máx 1 línea desktop / 3 mobile (CSS `-webkit-line-clamp`). |
| `tab_image` | `image_picker` | Ratio 1:1, círculo grande izquierdo. |
| `panel_title` | `inline_richtext` | "Consultoría y estrategia". |
| `panel_description` | `richtext` | Una línea desktop / 3 mobile. |
| **Items 1..8** (grupo repetido por número) | — | El schema declara 8 sets de settings con `header` separadores. |
| `item_N_icon` | `image_picker` | SVG icono. |
| `item_N_text` | `richtext` | 2 líneas desktop, 2 mobile (clamp). |
| `item_N_cta_text` | `text` | Opcional. |
| `item_N_cta_url` | `url` | Opcional. |
| `item_N_cta_target` | `select` (`same`/`new`/`contact_form`) | Reemplaza `checkbox`. |
| `item_N_cta_variant` | `select` (`primary`/`secondary`/`tertiary`) | Estilo DS. |
| `item_N_cta_icon` | `image_picker` | SVG. |

> **Justificación del item-as-flat-settings**: Shopify no soporta bloques anidados dentro de un block de sección con `content_for 'blocks'` de manera limpia (los `@theme` blocks rompen la compatibilidad con presets metafield). 8 grupos planos con `header` separadores son el patrón standard del theme y mantienen DX aceptable para 8 ítems máx.

### 4. Markup (resumen)

```liquid
<section
  id="{{ anchor_id }}"
  class="orn-services color-{{ color_scheme }} gradient"
  x-data="ornServices({ total: {{ valid_blocks_count }}, swipeMobile: {{ enable_swipe }} })"
  x-init="init()"
  aria-labelledby="{{ anchor_id }}-title"
>
  <h2 id="{{ anchor_id }}-title" class="orn-services__title">{{ section_title }}</h2>
  <p class="orn-services__subtitle">{{ section_subtitle }}</p>

  <div class="orn-services__tablist" role="tablist" aria-label="Servicios">
    <span class="orn-services__indicator" aria-hidden="true" :style="indicatorStyle"></span>
    <span class="orn-services__flash" aria-hidden="true" :class="{ 'is-flashing': flashing }" :style="flashStyle"></span>

    {%- for block in section.blocks -%}
      <button
        type="button"
        role="tab"
        :id="`tab-${ {{ forloop.index0 }} }`"
        :aria-selected="active === {{ forloop.index0 }}"
        :tabindex="active === {{ forloop.index0 }} ? 0 : -1"
        :aria-controls="`panel-${ {{ forloop.index0 }} }`"
        @click="goTo({{ forloop.index0 }})"
        @keydown="onTabKey($event, {{ forloop.index0 }})"
        class="orn-services__tab"
        :class="{ 'is-active': active === {{ forloop.index0 }} }"
        x-ref="tab{{ forloop.index0 }}"
      >
        <span class="orn-services__tab-label">{{ block.settings.tab_label_desktop }}</span>
        <span class="orn-services__tab-number">{{ block.settings.tab_number_icon | image_url: width: 48 | image_tag: alt: '' }}</span>
      </button>
    {%- endfor -%}
  </div>

  <div class="orn-services__panels"
       @touchstart.passive="onTouchStart($event)"
       @touchmove.passive="onTouchMove($event)"
       @touchend.passive="onTouchEnd($event)">
    {% content_for 'blocks' %}
  </div>

  {%- if cta_text != blank -%}
    <a class="orn-services__cta ornevo-btn ornevo-btn--{{ cta_variant }}" href="{{ cta_resolved_url }}" {% if cta_target == 'new' %}target="_blank" rel="noopener"{% endif %}>
      {{ cta_text }}
      {%- if cta_icon_svg -%}{{ cta_icon_svg | image_url: width: 24 | image_tag: alt: '' }}{%- endif -%}
    </a>
  {%- endif -%}
</section>
```

Cada panel (block):
```liquid
<div role="tabpanel"
     :id="`panel-${ {{ forloop.index0 }} }`"
     :aria-labelledby="`tab-${ {{ forloop.index0 }} }`"
     :hidden="active !== {{ forloop.index0 }}"
     class="orn-services__panel"
     :class="{ 'is-active': active === {{ forloop.index0 }} }">
  ...
</div>
```

### 5. Componente Alpine `ornServices`

State:
```js
{
  active: 0,
  prevActive: 0,
  flashing: false,
  indicatorStyle: '',
  flashStyle: '',
  total: 0,
  swipeMobile: true,
  touchStartX: 0,
  touchDeltaX: 0,
}
```

API:
- `init()` → mide la posición/ancho del tab activo, hidrata `indicatorStyle`, registra `ResizeObserver` para recalcular en breakpoints.
- `goTo(i)` → actualiza `prevActive`, `active`, recalcula `indicatorStyle`, dispara `flash(i)`, mueve foco al tab si la acción vino de teclado, y llama `scrollPanelIntoView()` en mobile si hubo swipe.
- `flash(i)` → setea `flashStyle` con coords del tab destino, `flashing = true`, y a los 350ms `flashing = false` (animación CSS de opacidad+escala, ver §6).
- `onTabKey(e, i)` → soporta `ArrowLeft`/`ArrowRight` (con wrap), `Home`, `End`. Llama `goTo` y mueve foco con `x-ref`.
- `onTouchStart/Move/End` → en `swipeMobile && viewport <= md`. Threshold 50px. `End` decide `goTo(active±1)` con clamp.
- `prefersReducedMotion()` → si `matchMedia('(prefers-reduced-motion: reduce)').matches`, salta la transición del indicador (set instantáneo) y omite el flash.

### 6. CSS — Magic Indicator

- `.orn-services__tablist` es `position: relative` con `display: flex`, `border-radius: 999px`, borde 1px primary.
- `.orn-services__indicator`: `position: absolute; inset: 4px auto 4px 0; border-radius: 999px; background: var(--color-primary, #0D4F4A); transition: transform .35s cubic-bezier(.65,.05,.35,1), width .35s cubic-bezier(.65,.05,.35,1);`. Su `transform: translateX(N px)` y `width` se setean inline desde `indicatorStyle`.
- `.orn-services__flash`: `position: absolute; pointer-events: none; border-radius: 50%; background: radial-gradient(circle, rgba(78,192,222,.55) 0%, rgba(78,192,222,0) 70%); opacity: 0; transform: scale(.4);`. Clase `.is-flashing` aplica `@keyframes orn-flash` (200ms in, 150ms out): opacidad 0→.9→0, scale .4→1.1.
- `.orn-services__tab.is-active` invierte color de texto al neutro 01.
- Tabs: `.orn-services__tab-label` visible ≥ md; `.orn-services__tab-number` visible < md (toggle por `display` en media query).
- Paneles: `.orn-services__panel` con `opacity .25s ease, transform .25s ease`; activo `opacity:1; transform:none`; inactivos `opacity:0; transform:translateY(8px); pointer-events:none`. `[hidden]` aplica tras 250ms vía `setTimeout` opcional (o usamos `aria-hidden`+`visibility:hidden` para que la transición de salida se vea).
- `prefers-reduced-motion`: anula transitions del indicador, panel y flash.
- `scroll-margin-top: var(--header-height, 80px)` en `.orn-services` para anclas.

### 7. Accesibilidad

- `role="tablist"` con `aria-label`, hijos `role="tab"` con `aria-selected`, `aria-controls`, `tabindex="0/-1"` (roving tabindex).
- Paneles `role="tabpanel"`, `aria-labelledby`, `hidden` cuando inactivo.
- Foco visible: outline 2px `#4ec0de` (acento) sobre el tab.
- Teclado: ←/→ navega tabs (con wrap), Home/End saltan al primero/último, Enter/Space activan (default de `<button>`).
- Swipe **no roba** el scroll: usamos `touch-action: pan-y` en `.orn-services__panels` y solo procesamos el swipe horizontal cuando `|deltaX| > |deltaY| * 1.5`.
- `prefers-reduced-motion: reduce` desactiva el desliz/flash.
- Imágenes decorativas (números/iconos) con `alt=""` y `aria-hidden`.

### 8. CTA con `contact_form`

Helper Liquid en la propia sección:
```liquid
{%- assign cta_resolved_url = cta_url -%}
{%- if cta_target == 'contact_form' -%}
  {%- assign cta_resolved_url = '#contact' -%}
{%- endif -%}
```
Se asume que existe un anchor `#contact` global; si no, queda hookeado para una futura sección de contacto sin romper el render.

## Consequences

**Positive:**
- Sección reutilizable real: cumple las restricciones de metafields → drop-in en producto/colección/blog.
- Magic Indicator sin dependencias: sólo CSS transitions + `transform` (GPU), animación 60 fps.
- Swipe sin librerías: ~30 líneas de touch handlers en Alpine.
- Patrón ARIA estándar de WAI: lectores de pantalla anuncian "tab 1 de 4 seleccionado".
- Respeta `prefers-reduced-motion` por defecto.

**Negative / trade-offs:**
- 8 ítems planos por bloque inflan el schema (~50 settings por block × 4 blocks). El editor los muestra todos — mitigado con `header` separadores claros (`Item 1`, `Item 2`, …) y orden A→Z dentro de cada grupo.
- SVG vía `image_picker` requiere subirlos como `.svg` (Shopify lo soporta). Se pierde el control inline `currentColor` que daba `textarea` en el hero, pero a cambio cumplimos metafields. Si en el futuro un consumidor necesita color dinámico, se documenta usar SVG con `fill="currentColor"` antes de subir.
- El cálculo del `indicatorStyle` requiere medir DOM en `init()` y en `resize`. Coste mínimo (≤4 tabs).

**Risks and mitigations:**
- **Riesgo:** layout shift al cambiar de panel si los paneles tienen alturas distintas. → **Mitigación:** `.orn-services__panels` con `min-height` igual al panel más alto (medido en JS al `init`) y `position: relative` con paneles absolutos en desktop; en mobile se permite altura natural ya que sólo se ve uno.
- **Riesgo:** swipe se confunde con scroll vertical en mobile. → **Mitigación:** `touch-action: pan-y` + threshold por ratio (X>1.5·Y) antes de cambiar tab.
- **Riesgo:** `image_picker` rechaza SVGs en algunas tiendas si tienen políticas restrictivas. → **Mitigación:** documentar en el `info` del setting que se aceptan SVG/PNG ≥ 48px; fallback a `image_tag` con alt vacío.
- **Riesgo:** sticky header oculta el ancla. → **Mitigación:** `scroll-margin-top: var(--header-height, 80px)` en `.orn-services`.
- **Riesgo:** un horizon-update toca `snippets/stylesheets.liquid` o `snippets/scripts.liquid`. → **Mitigación:** seguimos el mismo patrón que `orn-hero` (única línea adicional, contigua a las anteriores), fácil de re-aplicar tras merge.

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Bloques anidados (un block "tab" con sub-blocks "item") | `content_for` no soporta bloques anidados en presets de sección de manera estable; rompe metafields y el preview del editor. |
| GSAP / Motion One para Magic Indicator | Overkill; CSS transitions + `transform` cubren el efecto al 100% y el flash radial se resuelve con un keyframe. Menos JS, mejor LCP. |
| Swiper.js para mobile | Trae 30kB, conflictos potenciales con Alpine, y solo necesitamos un swipe simple entre 4 paneles. |
| `<details>`/`<summary>` accordion en mobile | Cambia el modelo mental; el spec dice "tabs con números", no accordion. |
| `textarea` para SVG icons (como en hero) | Bloquea el uso en metafields → rompe el requisito de reutilización en producto/colección. |
| `checkbox` para "abrir nueva pestaña" | Mismo bloqueo de metafields. Reemplazado por `select` con 3 opciones. |
| Tabs como `<input type="radio">` + CSS only | Imposible animar el indicador con `transform: translateX(N)` dependiente de mediciones DOM sin JS. |

## Implementation notes

### Archivos a crear
- `sections/orn-services.liquid`
- `blocks/_orn-services-tab.liquid`
- `snippets/orn-services-item.liquid`
- `assets/orn-services.css`
- `assets/orn-services.js`

### Archivos a editar
- `snippets/stylesheets.liquid` → añadir `{{ 'orn-services.css' | asset_url | stylesheet_tag }}`.
- `snippets/scripts.liquid` → añadir `<script src="{{ 'orn-services.js' | asset_url }}" defer></script>` **antes** de `alpine.min.js`.
- `templates/page.landing.json` → añadir `orn-services` en el `order` y configurar 4 blocks default con copy de placeholder.

### Orden de ejecución
1. Crear `assets/orn-services.css` (layout + magic indicator + responsive).
2. Crear `assets/orn-services.js` con el componente Alpine.
3. Crear `snippets/orn-services-item.liquid` (item del grid).
4. Crear `blocks/_orn-services-tab.liquid` con los 8 grupos de items.
5. Crear `sections/orn-services.liquid` con schema + tablist + content_for blocks.
6. Enganchar CSS y JS en los snippets correspondientes.
7. Añadir la sección a `templates/page.landing.json`.
8. Smoke test: theme editor → /landing → 4 tabs, click + swipe, ARIA con axe-core, `prefers-reduced-motion` con DevTools, anchor `/landing#servicios`.

### Variables CSS expuestas
```
--orn-services-indicator-bg: var(--color-primary, #0D4F4A);
--orn-services-flash-color: rgba(78,192,222,.55);
--orn-services-tab-radius: 999px;
--orn-services-transition: .35s cubic-bezier(.65,.05,.35,1);
```

### Breakpoint
Reusar `--breakpoint-md` de Horizon (768px). Mobile = `< md`.

## References

- Spec: `landing/specs-services.md`.
- Wireframes: `landing/slice_services_desktop.png`, `landing/slice_services_1_responsive.png`, `landing/slice_services_2_responsive.png`.
- Magic Indicator inspo: `landing/transicion/transicion_*.png` + Dribbble (`https://cdn.dribbble.com/userupload/26089137/file/original-8ddb6034e52dc066fe018643a27c0584.mp4`).
- ADR-0001 — design system base (color schemes, fuentes, botones).
- WAI-ARIA Authoring Practices — Tabs Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- Shopify metafield compatibility: https://shopify.dev/docs/storefronts/themes/architecture/settings#metafields
