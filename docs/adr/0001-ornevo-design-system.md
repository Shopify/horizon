# ADR-0001: Ornevo Design System sobre Horizon

**Date:** 2026-04-24
**Author(s):** Miguel Soler
**Status:** Accepted

## Context

Estamos construyendo la landing de Ornevo sobre el tema **Horizon** de Shopify (v3.4.0). El manual de marca define paleta, tipografías (Sora + DM Sans), pilares (Continuidad, Evolución, Precisión, Cercanía) y un tono sobrio, fluido y moderno.

Horizon centraliza sus tokens de diseño en:
- `snippets/theme-styles-variables.liquid` → CSS custom properties globales (colores, fuentes, spacing, radios).
- `config/settings_schema.json` → Color schemes y pickers de fuentes del theme editor.
- `snippets/fonts.liquid` → Declaraciones `@font-face` del font picker de Shopify.

El tema se actualiza periódicamente (ver commits `horizon-update-*`), así que los cambios deben sobrevivir merges con upstream.

Ni **Sora** ni **DM Sans** son 100% consistentes en el font picker de Shopify, y queremos control sobre el `font-display` y el preload para evitar FOUT en la hero.

## Decision drivers

- **Must:** paleta y tipografía respetan 1:1 el manual de marca.
- **Must:** scope global — los tokens aplican al theme completo, no sólo a la landing.
- **Must:** sistema de botones con 3 variantes (primary, secondary, tertiary) con microinteracciones de las referencias (codepen avvign/NVJzQW → fill deslizante; davidicus/emgQKJ #4 → underline animado).
- **Should:** cambios localizados en pocos archivos para sobrevivir updates de Horizon.
- **Should:** Google Fonts con preload para minimizar LCP impact.
- **Nice to have:** documentación de tokens usable por futuros devs/diseñadores.

## Decision

Adoptamos un design system **global sobre Horizon** usando su infraestructura nativa:

1. **Color schemes nativos** en `config/settings_data.json`. Reescribimos los 7 schemes existentes (`scheme-1`…`scheme-6` + el UUID extra) manteniendo sus IDs para no romper referencias en `sections/` y `blocks/`. Cada scheme se mapea a un rol de marca:
   - `scheme-1` → **Light** (fondo blanco, heading verde primario) — default para secciones de contenido.
   - `scheme-2` → **Cream** (fondo `#F2EDE3`) — secciones cálidas tipo testimonios.
   - `scheme-3` → **Brand** (fondo `#0D4F4A` primario, texto blanco, botón primario blanco con texto verde) — hero principal.
   - `scheme-4` → **Deep** (fondo `#103229` casi-negro verdoso) — footer y secciones dramáticas.
   - `scheme-5` → **Medium** (fondo `#3E8F87` secundario 02, texto blanco) — acentos secundarios.
   - `scheme-6` → **Transparent Dark** (sobre imagen, texto blanco) — overlays.
   - `scheme-58084d4c-…` → **Transparent Light** (sobre imagen clara, texto primario) — overlays invertidos.

   Actualizamos tanto el bloque `current` como `presets.Default` para que un reset del theme editor no destruya la marca.

2. **Tipografía vía el font picker nativo de Shopify**: `type_heading_font` → `sora_n7`, `type_subheading_font` → `sora_n6`, `type_body_font` → `dm_sans_n4`, `type_accent_font` → `sora_n6`. Shopify sirve ambas desde su CDN (Google Fonts upstream) y `snippets/fonts.liquid` ya genera `<link rel="preload">` para cada una — no requiere código adicional.

3. **Sistema de botones** en `assets/ornevo-buttons.css` con tres variantes declaradas como clases utilitarias (`.ornevo-btn`, `.ornevo-btn--primary|secondary|tertiary`):
   - **Primary** — fondo `#0D4F4A`, texto `#FFFFFF`. Hover: fill deslizante en `#103229` desde el borde inferior (avvign style).
   - **Secondary** — transparente, borde 1.5px `#0D4F4A`, texto primario. Hover: fill sólido desde izquierda con inversión de texto a blanco.
   - **Tertiary** — sólo texto primario con underline animado (davidicus #4): la línea aparece desde el centro y se extiende al hover; sin fondo, sin borde.

El **acento `#4ec0de`** queda reservado a uso decorativo (líneas de separación, dots del manual, highlights puntuales). No se usa para CTAs ni estados interactivos.

## Consequences

**Positive:**
- **Editables desde theme editor**: el cliente puede ajustar colores sin tocar código.
- **Cero código custom de tokens**: Horizon ya expone `--color-*`, `--font-*` derivadas de los schemes — seguimos el camino que el tema soporta oficialmente.
- **Preload de fuentes gratis**: `snippets/fonts.liquid` ya preloadea las 4 fuentes del picker.
- **Botones aislados**: `ornevo-buttons.css` no colisiona con `.button` nativo; vive como clase paralela.

**Negative / trade-offs:**
- Si un `horizon-update-*` añade un nuevo campo a los color schemes (ej: un nuevo rol de botón terciario nativo), nuestros schemes lo heredarán con default y quizá haya que patchear `settings_data.json` manualmente.
- Sora/DM Sans dependen de que Shopify los tenga en su librería con los identificadores esperados (`sora_n7`, `dm_sans_n4`). Si cambian el handle, hay que actualizar `settings_data.json`. Mitigable con fallback system-ui.
- El hover de los botones usa `::before`/`::after` con transforms — requiere que los consumidores no pisen `position: relative` ni pseudoelementos.

**Risks and mitigations:**
- **Riesgo:** editor del cliente reescribe un scheme y pierde la marca. → **Mitigación:** `presets.Default` mantiene la versión Ornevo; al resetear vuelve.
- **Riesgo:** `ornevo-buttons.css` no se carga porque olvidamos referenciarlo. → **Mitigación:** incluirlo vía `{{ 'ornevo-buttons.css' | asset_url | stylesheet_tag }}` en `layout/theme.liquid` junto al CSS base.
- **Riesgo:** el acento celeste `#4ec0de` se usa por error en botones/CTAs. → **Mitigación:** no se expone como color de botón en ningún scheme; sólo usable vía CSS variable explícita `--ornevo-accent` (definida localmente donde haga falta).

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Snippet custom con CSS custom properties que sobreescriben `--color-*` de Horizon | Duplicaría tokens, bloquea edición desde theme editor, más difícil de mantener en updates del tema. Descartado en favor del esquema nativo. |
| Self-host de fuentes (woff2 en `assets/`) | Más control pero requiere licencias manejadas a mano; el picker de Shopify ya entrega Sora y DM Sans con preload. |
| Google Fonts via `@import` directo | Perdemos el `<link rel="preload">` automático y duplicamos requests con los que ya hace Horizon. |
| Forkear `theme-styles-variables.liquid` directo | Merge conflicts garantizados en cada update de Horizon. |
| Sistema de botones mediante override de `.button` nativo de Horizon | Colisiona con usos existentes del theme (checkout, PDP), riesgo alto de regresiones fuera de la landing. |
| Tailwind utility layer | Overkill para una landing; incompatible con el pipeline de assets de Shopify (no hay build step nativo). |

## Implementation notes

### Paleta (para referencia de schemes)

```
Primario:       #0D4F4A
Secundario 01:  #103229
Secundario 02:  #3E8F87
Acento:         #4EC0DE  (sólo decorativo — no en schemes)
Neutro 01:      #FFFFFF
Neutro 02:      #F2EDE3
Neutro 03:      #E5E7EB
Neutro 04:      #374151
Neutro 05:      #0F1720
```

### Mapeo Sora/DM Sans (Shopify font picker)

| Rol | Identificador | Uso |
|-----|--------------|-----|
| `type_heading_font` | `sora_n7` | H1–H3, CTAs hero |
| `type_subheading_font` | `sora_n6` | H4–H6, eyebrows |
| `type_body_font` | `dm_sans_n4` | Párrafos, UI, botones |
| `type_accent_font` | `sora_n6` | Labels, chips, pull-quotes |

### Archivos a tocar
- `config/settings_data.json` — reescribir los 7 color schemes (bloques `current` y `presets.Default`) + cambiar los 4 `type_*_font`.
- `assets/ornevo-buttons.css` — **crear** con `.ornevo-btn--primary|secondary|tertiary` y animaciones.
- `layout/theme.liquid` — añadir `{{ 'ornevo-buttons.css' | asset_url | stylesheet_tag }}` en `<head>`.

### Orden de ejecución
1. Actualizar `settings_data.json` (schemes + fonts).
2. Crear `assets/ornevo-buttons.css`.
3. Enganchar el CSS en `layout/theme.liquid`.
4. Smoke test: abrir `/` en theme editor, verificar colores y que las fuentes cargan.

## References

- Manual de marca Ornevo (`landing/manual_marca*.png`).
- Horizon v3.4.0 — `snippets/theme-styles-variables.liquid`.
- Button inspo: https://codepen.io/avvign/pen/NVJzQW
- Button inspo: https://codepen.io/davidicus/pen/emgQKJ (variante #4)
