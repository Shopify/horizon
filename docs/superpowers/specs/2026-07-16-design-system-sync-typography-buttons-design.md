# Syncing the Horizon theme with the Mionas design system — typography & buttons

**Date:** 2026-07-16
**Status:** Approved design, pending implementation plan
**Scope:** Typography and buttons only.

## Problem

The Horizon storefront theme and the Mionas design system have drifted. The theme renders
**Inter** throughout; the brand faces are **Archivo** (display & body) and **Oswald**
(stamp/claims). Nothing connects the two repos: the theme's type values are hand-set in the
Shopify theme editor and have no relationship to `../design-system`.

Colours and button radius are the exception — they already match by coincidence of manual
entry (`color1 #0B078C`, `color2 #AF200B`, background `#FFF8F0`, button radius `100`). This
work does not touch them.

## Sources and their disagreement

Three artifacts describe "the design system", and they do not agree:

| Source | Type scale | Families |
| --- | --- | --- |
| `../design-system/src` (repo tokens) | 5 sizes (10/13/16/18/32); roles display·body·label·caption | Archivo only |
| claude.ai prototype `f8618baa` (`_ds/…-b182af32`) | 11 slots (48/36 · 28/22/18 · 18/16/13 · 15/13/11) | Archivo + Oswald + tracking |
| `../design-system/ds-bundle` | mirrors the repo tokens (`Text variant: display\|body\|label\|caption`) | Archivo only |

The prototype's design system is a **different** system, sourced from `mionas-app/src/theme.ts`.
It is the design intent. The repo tokens are the machine-readable source of truth but
**cannot currently express that intent** — `font-size.xl` is 32px where the target display is
48px, and there is no Oswald token at all (`src/fonts.css` imports the face, but nothing
references it).

**Resolution:** the prototype is the target; `../design-system` remains the single
machine-readable source. The design system is extended to express the target, then the theme
is synced from it.

## Scope

**In scope (this spec):** the sync mechanism and the mapping contract — how built design-system
tokens reach the Horizon theme, and which Horizon variable each token drives.

**Out of scope (separate spec, in `../design-system`):** extending the design system's tokens to
contain the target values. That work is governed by `../design-system/CLAUDE.md` — strict naming
templates, the `groups.js` tier-partition rule, and documented silent-failure modes on renames.
Those decisions must be made with that ruleset in context and verified by that repo's build and
Storybook. This spec defines *which values the sync needs*, not what they are named.

**Out of scope entirely:** colours, spacing, the four button variants Horizon does not render
(see "Buttons"), and any component beyond typography and buttons.

## Sequencing

The design-system extension ships **first**. Until its tokens exist, the bridge has nothing to
point at. This spec's implementation plan assumes the extension is complete and the required
tokens are present in `dist/tokens.css`.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Sync direction | Repo becomes authoritative; move from pull to push | Currently every commit is "Update from Shopify for theme horizon/main"; `settings_data.json` is admin-generated and would otherwise clobber synced values. |
| Source of truth | Prototype is the target; extend `../design-system`, sync theme from it | One machine-readable source; no permanent drift between two systems. |
| Delivery | Build the sibling repo, copy the built artifact into a committed file | Mirrors the existing `mionas-app/scripts/sync-design-tokens.mjs` precedent exactly. |
| Artifact | `dist/tokens.css` | Already the right shape: self-contained `:root` custom properties, no imports, no build step needed in the theme. |
| Fonts & casing | Shopify settings, not CSS | `font_picker` supports the brand faces natively; Shopify then self-hosts, preloads and `font_face`s them. The Google Fonts request is dropped. |
| Exact numbers | A new bridge snippet | Overrides Horizon's final `--font-*` variables directly. |
| Fluid type | DS token becomes the `clamp()` maximum, for h1 only | Preserves Horizon's responsive scaling; a fixed 48px heading would overflow on a phone. Only h1 reaches Horizon's 48px fluid cutoff. |

## Architecture

```
../design-system  ──npm run build──▶  dist/tokens.css
                                          │  copied verbatim
                                          ▼
              horizon/assets/design-tokens.css   (generated, committed)
                                          │  linked in stylesheets.liquid
                                          ▼
              snippets/design-system-bridge.liquid
                     (maps Horizon vars ──▶ DS vars)
```

Four pieces:

**1. `scripts/sync-design-tokens.mjs`** — mirrors `mionas-app/scripts/sync-design-tokens.mjs`:
`execSync("npm run build")` in `../design-system`, then `copyFileSync` `dist/tokens.css` →
`assets/design-tokens.css`. No Prettier step: the theme has no formatter and the file is
generated output. The copy is verbatim; the file carries the design system's own
"AUTO-GENERATED" provenance.

**2. `package.json`** — minimal and private, exposing `"tokens:sync"`. Shopify uploads only
`assets/ blocks/ config/ layout/ locales/ sections/ snippets/ templates/`, so `package.json`
and `scripts/` stay local and never ship to the store.

**3. `snippets/design-system-bridge.liquid`** — a **new** snippet, rendered in `theme.liquid`
immediately after `theme-styles-variables`, re-pointing Horizon's final type variables at DS
variables.

Deliberately *not* an edit to `theme-styles-variables.liquid`. That file is upstream Shopify
code that changes on every theme update; editing it means a merge conflict each time. A separate
snippet reduces the merge surface to a single `{% render %}` line in `theme.liquid`.

**4. `config/settings_data.json`** — font slots and casing (below).

## Contract: what the design system must expose

The design-system spec owns the token *names*; it must expose one token per row below. The
bridge is authored against the names that spec fixes. Expected names follow the repo's existing
bundled-role convention (`type.<role>.<property>` → `--type-<role>-<property>`), e.g.
`--type-display-lg-font-size`.

| Role | font-size | line-height | font-weight | family | tracking | case |
| --- | --- | --- | --- | --- | --- | --- |
| display-lg | 48px | 58px | 700 | Archivo | 0.02em | uppercase |
| display-md | 36px | 44px | 700 | Archivo | 0.02em | uppercase |
| heading-lg | 28px | 36px | 700 | Archivo | 0.02em | uppercase |
| heading-md | 22px | 28px | 700 | Archivo | 0.02em | uppercase |
| heading-sm | 18px | 24px | 600 | Archivo | 0.02em | uppercase |
| body-md | 16px | 24px | 400 | Archivo | 0 | none |

Only the **font-size, line-height and tracking** columns are consumed by the bridge. The
`family`, `font-weight` and `case` columns are recorded so the two systems agree on the design;
in the theme they are delivered through Shopify's font slots and `type_case_*`, not through CSS.

Also required: an Oswald family token (the stamp face). Like the other families it is not
bridge-consumed — it is wired through Shopify's `accent` font slot — but the design system must
define it so the two systems agree. Today `src/fonts.css` loads Oswald while no token references
it.

Buttons need **no new tokens**. `dist/tokens.css` already carries everything used:
`--button-size-{sm,md,lg}-height` (40/48/56), `--button-size-*-padding`, `--button-size-*-font-size`,
`--button-state-pressed-scale` (0.97), `--button-state-pressed-opacity` (0.92),
`--button-state-disabled-opacity` (0.5), `--button-base-radius`.

## Mapping

Horizon emits, per preset (`paragraph, h1…h6`), the final variables `--font-<preset>--size`,
`--line-height`, `--letter-spacing`, `--weight`, `--family`, `--style`, `--case`.

**The bridge overrides exactly three: `--size`, `--line-height`, `--letter-spacing`.** These are
the only three Shopify settings cannot express:

- `type_size_h*` is an enum (10/12/14/16/18/20/24/32/40/48/56/72…) with no 36/28/22.
- line-height presets are ratios (1 / 1.1 / 1.2 …) and cannot hit 58/48 or 44/36.
- letter-spacing presets offer only ±0.03em, where the brand needs 0.02em.

Because the bridge overrides these **final** variables, `config/settings_schema.json` is never
forked.

**`--family`, `--weight`, `--style` and `--case` are left alone — they come from settings.**
Overriding `--family` in CSS would hardcode Archivo and defeat the Shopify font-hosting and
preloading this design deliberately buys. Weight needs no work either: it follows the font slot,
which already lands on every target value.

| Preset | Slot | Slot font | Weight | Target |
| --- | --- | --- | --- | --- |
| h1–h4 | `heading` | `archivo_n7` | 700 | 700 ✓ |
| h5–h6 | `subheading` | `archivo_n6` | 600 | 600 ✓ |
| paragraph | `body` | `archivo_n4` | 400 (hardcoded by Horizon) | 400 ✓ |

`type_font_h1`–`h4` are already `heading` and `type_font_h5`–`h6` already `subheading`, so these
need no settings change — only the font slots themselves are repointed from Inter to Archivo.

| Horizon preset | DS role | Rendered as |
| --- | --- | --- |
| `h1` | display-lg | 48 / 58 / 700 · uppercase · 0.02em |
| `h2` | display-md | 36 / 44 / 700 · uppercase · 0.02em |
| `h3` | heading-lg | 28 / 36 / 700 · uppercase · 0.02em |
| `h4` | heading-md | 22 / 28 / 700 · uppercase · 0.02em |
| `h5` | heading-sm | 18 / 24 / 600 · uppercase · 0.02em |
| `h6` | heading-sm | 18 / 24 / 600 · uppercase · 0.02em (identical to h5) |
| `paragraph` | body-md | 16 / 24 / 400 · sentence case · 0 tracking |

`h6` intentionally renders identically to `h5`: the prototype has no sixth heading level, and
keeping h6 a true heading is preferred over demoting it to a label.

### Fluid sizing — h1 only

Horizon makes a preset fluid only when its size reaches `fluid_size_cutoff = 48`; anything
smaller is emitted as a fixed `rem`. Of the target scale, **only h1 (48px) qualifies**. h2 (36)
through paragraph (16) are fixed in Horizon's own model, so the bridge emits their tokens
directly with no `clamp()`.

For h1, the DS token supplies the **maximum**, preserving Horizon's `clamp(min, vw, max)` shape:

```css
--font-h1--size: clamp(2.75rem, 4.8vw, var(--type-display-lg-font-size));
```

The two literals reproduce Horizon's own algorithm rather than inventing values. Note the
algorithm runs over the **configured settings sizes**, which this spec does not change — they
stay `{16, 18, 24, 32, 40, 48}`:

- `4.8vw` is Horizon's `value × 0.1vw` ratio for a 48px preset.
- `2.75rem` (44px) is Horizon's derived minimum: the next configured size down from 48 is 40,
  which is under the 48 cutoff, so the algorithm takes `40 + 4`.

These are computed once and written as literals in the bridge; the theme's own fluid loop is not
reimplemented. `base.css` independently floors headings with `max(1rem, var(--font-h1--size))`,
which remains in effect.

### Buttons

Horizon renders exactly two colour variants (primary, secondary). Its `button--*` modifiers are
structural, not chromatic — `--with-label`, `--unstyled`, `--full-width`, `--arrow`, `--text`,
`--add`, `--choose`, `--empty`, `--integrated`. **No consumer exists** for the design system's
`outline`, `ghost`, `danger`, or `inverse` variants, so they are not emitted. Emitting them would
also drag in `brand.tint` / `feedback.danger` / `surface.default`, reopening the colour mapping
this spec avoids.

The bridge therefore covers buttons only where Horizon already has a slot:

- Type: `--button-font-family-{primary,secondary}` follow the settings font slots; button
  font-size maps to `--button-size-md-font-size`.
- States: press scale/opacity and disabled opacity map to the `--button-state-*` tokens.
- Radius: **no change.** `button_border_radius_{primary,secondary}` is already `100` (pill),
  matching `--button-base-radius`.
- Colour: **no change.** The palette already matches the brand.

## Settings changes (`config/settings_data.json`)

| Setting | From | To |
| --- | --- | --- |
| `type_body_font` | `inter_n4` | `archivo_n4` |
| `type_subheading_font` | `inter_n5` | `archivo_n6` |
| `type_heading_font` | `inter_n7` | `archivo_n7` |
| `type_accent_font` | `inter_n7` | `oswald_n6` |
| `type_case_h1` … `type_case_h6` | `none` | `uppercase` |

Verified available in Shopify's font library: `archivo_n1`–`n9` (plus italics) and
`oswald_n2`–`n7`. Because these are library fonts, Shopify serves and preloads them via
`font_face` — the storefront makes no Google Fonts request, unlike the design system's own
`src/fonts.css`.

`type_case_*` is set through settings rather than the bridge so the theme editor stays honest
about the brand's uppercase rule.

## Failure modes and verification

**The known silent failure is a missing token.** A `var(--type-display-lg-font-size)` that does
not exist falls back to unset and the type silently reverts — the same silent class of failure
`../design-system/CLAUDE.md` documents for stale `var()` references in its own CSS modules.

**Mitigation — fail loudly.** `sync-design-tokens.mjs` asserts that every variable named in the
mapping is present in the copied `tokens.css`, and exits non-zero listing any that are missing.
This converts the soft cross-repo dependency into a hard build failure, matching the design
system's stated preference for loud errors over silent fallbacks.

**Verification:**

1. `npm run tokens:sync` succeeds and `assets/design-tokens.css` contains every mapped variable.
2. The sync script exits non-zero when a required token is removed from the design system.
3. `shopify theme dev` renders h1–h6 and paragraph at the sizes/weights/tracking in the mapping
   table, uppercase where specified, in Archivo.
4. Headings scale fluidly: no horizontal overflow at 375px width.
5. No network request to `fonts.googleapis.com`.
6. Primary and secondary buttons keep their pill radius and current colours, and press/disabled
   states match the `--button-state-*` tokens.

## Risks

- **The design-system extension is a prerequisite.** This spec is blocked until those tokens exist.
- **`settings_data.json` is admin-generated.** Until the move to push is complete, a theme-editor
  save can revert the font settings. The bridge (CSS) is unaffected; only the settings half is at
  risk.
- **The theme editor will display stale sizes.** Because sizes stay in settings while the bridge
  overrides the rendered value, the editor shows h2/h3/h4 as 40/32/24 while the page renders
  36/28/22. This is an accepted, inherent cost of choosing the bridge over settings for sizes
  (the enum cannot hold the real values) — recorded here so it is a known gap, not a surprise.
- **The type scale changes meaning in the design system.** Existing roles (`display`, `caption`)
  and sizes (`xl` = 32px) shift. That is the other spec's problem to sequence, but it will change
  how existing design-system components render.
