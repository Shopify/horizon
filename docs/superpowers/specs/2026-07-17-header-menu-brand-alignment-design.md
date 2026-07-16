# Bringing the Horizon header menu to the Mionas brand

**Date:** 2026-07-17
**Status:** Approved design, pending implementation plan
**Scope:** Header nav menu, submenu panel and mobile drawer.

## Problem

The `f8618baa` prototype shows a Mionas-branded header. The Horizon storefront renders
Horizon's stock header. The two differ, and nothing connects the theme's header styling to
`../design-system`.

Most of the difference is already solved. Horizon natively provides the sticky header, the
logo-left / menu-left / actions-right layout, the 1px bottom border, hover submenus on nested
link lists, and the mobile drawer. `sections/header-group.json` already sets
`enable_sticky_header: always`, `border_width: 1` and `bottom_border_color: color3`.

The theme's colour palette also already matches the design system exactly — no colour work is
required for the header:

| Theme palette | Value | Design-system token |
| --- | --- | --- |
| `background` | `#FFF8F0` | `--cream` |
| `color1` | `#0B078C` | `--blau-sitges` |
| `color2` | `#AF200B` | `--vermell-segell` |
| `color3` | `#ece4d8` | `--warm-beige` (already the header's border) |

What remains is the nav's typography and hover state.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Fidelity | Brand alignment, not reproduction | Use Horizon's native header mechanics; bring them to brand via settings + bridge CSS. Consistent with the typography/button spec on this branch. |
| Off-system prototype values | Snap to nearest design-system tokens | The prototype's nav type is off-system (below). Snapping keeps one source of truth and unblocks the work. |
| Override location | New `snippets/header-bridge.liquid` | One clear purpose per file: the existing bridge maps global type presets at `:root`; this one styles header components. |
| Weight delivery | Font slot, never CSS | Archivo 500 never loads; `font-weight: 500` would silently render 400. The slot delivers a real face. |

## The prototype's nav type is off-system

The prototype styles its nav with an ad-hoc `.mi-nav` class — **14px / weight 600 / .01em
tracking**. None of those three values are design-system tokens:

- The type scale jumps from `label-lg` (15px/500) to `body-sm` (13px/400). There is no 14px
  label role and no 14/600 slot.
- Tracking tokens are only `0`, `0.02em` and `0.05em`. There is no `0.01em`.

"Match the prototype" and "align to the design system" therefore disagree. **This spec snaps to
the tokens.** The nav renders at `label-lg`, accepting a deliberate departure from the
prototype's exact pixels. This is the opposite resolution to the typography spec — which
extended the design system to express the prototype's intent — because the departure here is
small (15px vs 14px, 0.02em vs 0.01em) and extending the design system would block this work on
the sibling repo for an imperceptible gain.

## Token mapping

`assets/design-tokens.css` is already synced and already contains every token this spec needs —
the design-system extension the typography spec depended on has shipped. No sibling-repo work is
required.

| Element | Design-system role | Delivered as |
| --- | --- | --- |
| Nav link | `label-lg` | 15px / 20px / 600 / 0.02em |

`--text-role-label-lg-*` resolves to `15px / 20px / 500 / 0.02em`.

**The token says weight 500; the storefront delivers 600.** This is deliberate and follows the
typography spec's rule that the bridge never overrides weight — weight comes from the Shopify
font slot. Horizon `font_face`s only each slot's own weight plus its bold
(`snippets/theme-styles-variables.liquid:45-51`), so the loaded Archivo faces are 400, 600 and
700. A CSS `font-weight: 500` would match 400 under CSS font matching and render *lighter* than
intended. Pointing the nav at the `subheading` slot (`archivo_n6`) delivers a real 600 face.
The token's 500 is recorded-but-not-delivered — the same pattern every heading weight already
uses.

## Architecture

```
../design-system  ──npm run build──▶  dist/tokens.css
                                          │  copied verbatim (already synced)
                                          ▼
              horizon/assets/design-tokens.css
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
        design-system-bridge.liquid          header-bridge.liquid   ← NEW
        (global type presets, :root)         (header components)
```

Both snippets are rendered from `layout/theme.liquid` after `theme-styles-variables`, so their
declarations win the cascade. `header-bridge.liquid` is rendered after `design-system-bridge`.

Deliberately **not** an edit to `blocks/_header-menu.liquid`. That file is upstream Shopify code
that changes on every theme update; editing it means a merge conflict each time. A separate
snippet keeps the merge surface to a single `{% render %}` line in `theme.liquid`.

## Mechanisms

Three mechanisms, the same split the typography spec fixed:

| Mechanism | Used for |
| --- | --- |
| Shopify settings (`sections/header-group.json`) | Anything settings can express |
| `snippets/header-bridge.liquid` | Only what settings cannot |
| Shopify admin (`link_list`) | The menu items themselves — configuration, not code |

The third row is load-bearing. The prototype's nav items are prototype JS state. In the theme,
"Tienda / Regalos / Ocasiones / Empresas / Cursos / Nosotros" and Tienda's submenu are a Shopify
link list configured in admin. No Liquid change creates them. `header-group.json` currently
points the menu block at `menu-temp`.

## Mapping

Horizon derives the top-level menu variables in `snippets/menu-font-styles.liquid`:

```
--menu-top-level-font-family:  var(--font-<type_font_primary_link>--family)
--menu-top-level-font-weight:  var(--font-<type_font_primary_link>--weight)
--menu-top-level-font-size:    var(--menu-font-sm--size)     (mega_menu)
--menu-top-level-font-size-desktop: <type_font_primary_size>
--menu-top-level-font-color:   var(--color-foreground)
```

| Property | Target | Mechanism | Why |
| --- | --- | --- | --- |
| Family | Archivo | setting (font slot) | Follows `type_font_primary_link`. |
| Weight | 600 | setting: `type_font_primary_link` `body` → `subheading` | `archivo_n6`, a loaded face. |
| Size | 15px | `header-bridge.liquid` | `type_font_primary_size` is an enum of 10/12/14/16/18px — it has no 15. |

Horizon derives **two** size variables — `--menu-top-level-font-size` and
`--menu-top-level-font-size-desktop` — and which one governs the rendered desktop size is not
settled by this design. Resolving that, and overriding the correct one (or both), is a planning
detail for the implementation plan to establish against the theme's CSS.
| Tracking | 0.02em | `header-bridge.liquid` | Horizon derives **no letter-spacing variable** for the menu, so this is a direct rule on `.menu-list__link`, not a variable override. |
| Hover colour | `color1` | `header-bridge.liquid` | Horizon has no menu hover-colour setting. |

`type_font_primary_size` is already `0.875rem` and `type_case_primary_link` is already `none`;
both stay as they are. The size setting becomes inert once the bridge overrides the variable —
recorded below as a known editor-honesty gap.

### Settings change

| File | Setting | From | To |
| --- | --- | --- | --- |
| `sections/header-group.json` | `type_font_primary_link` | `body` | `subheading` |

That is the only settings change in this spec.

### Submenu panel

The submenu stays Horizon's mega-menu. Its panel background comes from the menu block's
`background_color`, already `{{ settings.color_palette.background }}` — cream, already correct.
No work.

### Mobile drawer

The prototype has **no mobile design**, so there is no reference to be faithful to. The drawer
inherits the same tokens through the same variables and changes nothing structural. This is an
extrapolation from the desktop brand, recorded as such so it is not mistaken for a match.

## Deliberate non-changes

- **Nav text colour.** Horizon uses `--color-foreground` (`#11181C`); the prototype's `--negre`
  is `#101413`. The difference is imperceptible, and overriding it would fight the theme's
  contrast system for no visible gain.
- **The compact dropdown card.** The prototype's submenu is a 230px anchored card. Horizon's is
  `position: absolute; width: 100%; left: 0` — a full-width panel (`blocks/_header-menu.liquid:398-408`).
  Reshaping it is a custom build, excluded by the brand-alignment decision.
- **The ES/CA language pill.** Localization stays Horizon's native form.
- **The "Sant Jordi" campaign item.** Oswald stamp face, red, with a dot, shown conditionally.
  No Horizon equivalent; it would be a custom block.
- **The overflow "More" item.** Horizon collapses nav items that do not fit into a `slot="more"`
  dropdown. The prototype has no such affordance. Left native.

Each of these remains available as its own piece of work if it turns out to be a must-have.

## Out of scope

Dropped by explicit decision, recorded so the deviations are known rather than discovered:

- **Cart bubble.** `bubble_background_color` is `""`, which falls back through `text_color_top`
  to `page_text_color` (`sections/header.liquid:55`). The bubble therefore renders **near-black,
  not `vermell-segell`**, and this spec leaves it that way.
- **Search action.** Left as-is.
- **Announcement bar.** `header-group.json` contains only `header_section` — there is no
  announcements section on the storefront today. This spec does not add one, so **the
  prototype's blue announcement strip will not exist**.

## Verification

The theme has no test framework; verification is `shopify theme check` plus observation under
`shopify theme dev`.

1. `shopify theme check` passes.
2. Nav links render at 15px / 20px line-height / 0.02em tracking, in Archivo.
3. Computed nav `font-weight` is 600 **and `archivo_n6` appears in the Network tab** — proving a
   real face rather than a synthesized weight.
4. Nav links hover to `#0B078C`.
5. The submenu opens on hover and its panel background is cream.
6. No horizontal overflow at 375px; the drawer opens and is legible.
7. No network request to `fonts.googleapis.com`.

## Risks

- **The bridge targets upstream internals.** `--menu-top-level-font-size` and `.menu-list__link`
  are Horizon's private structure, not a public API. A theme update can rename them and the
  styling silently reverts. Unlike the token contract — which `scripts/design-tokens-contract.mjs`
  asserts on — **there is no equivalent guard for CSS selectors.** This is the design's softest
  joint. A cheap mitigation, deferred to the plan: assert in the sync script that
  `_header-menu.liquid` still contains the selectors the bridge depends on.
- **`header-group.json` is admin-generated.** Its own header says so. The `type_font_primary_link`
  change lives in a file a theme-editor save can revert. Same unresolved risk the typography spec
  logged for `settings_data.json`; it persists until the pull→push move is complete. The bridge
  CSS is unaffected — only the settings half is exposed.
- **The nav depends on admin configuration.** Until a `link_list` exists with the real items and
  Tienda's nested submenu, the styling has nothing correct to style. `header-group.json` points at
  `menu-temp` today.
- **The theme editor will show a stale nav size.** `type_font_primary_size` stays `0.875rem` (14px)
  while the bridge renders 15px. Inherent to choosing the bridge over settings — the enum cannot
  hold 15 — and recorded so it is a known gap, not a surprise. This mirrors the same accepted cost
  for h2/h3/h4 in the typography spec.
