# Header Menu Brand Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Horizon header nav at the Mionas design system's `label-lg` role — 15px / 20px / 600 / 0.02em in Archivo, hovering to `blau-sitges` — driven by tokens rather than hand-set values.

**Architecture:** One Shopify settings change points the nav at the `subheading` font slot (delivering a real Archivo 600 face). One new snippet, `snippets/header-bridge.liquid`, supplies the three values Shopify settings cannot express. The snippet **declares CSS variables that Horizon already consumes** — it never overrides `font-size` or `color` directly. No upstream file is edited except a single `{% render %}` line in `layout/theme.liquid`.

**Tech Stack:** Shopify Liquid, Shopify CLI (`shopify theme check`, `shopify theme dev`). No npm build step, no test framework.

**Spec:** `docs/superpowers/specs/2026-07-17-header-menu-brand-alignment-design.md`

## Global Constraints

- **Never commit.** `CLAUDE.md` states: "Never commit anything to git when following a superpowers skill — skip any commit steps entirely." No task in this plan has a commit step. Leave all work in the working tree.
- **Never run `shopify theme push`.** `CLAUDE.md`: only when explicitly asked; it changes the live store.
- **Never edit `blocks/_header-menu.liquid`, `snippets/menu-font-styles.liquid`, `snippets/header-drawer.liquid` or `snippets/theme-styles-variables.liquid`.** These are upstream Shopify files that change on every theme update. The only upstream edit permitted is one `{% render %}` line in `layout/theme.liquid`.
- **Declare variables, never fight properties.** `snippets/design-system-bridge.liquid` renders in `<head>` (`layout/theme.liquid:32`), but `blocks/_header-menu.liquid`'s `{% style %}` renders in the **body — later in the document**. At equal specificity the block's rules win. Therefore the bridge must declare the CSS variables Horizon reads, on the element that reads them, rather than setting `font-size`/`color`. The one exception is `letter-spacing`, for which Horizon derives no variable and sets no competing rule.
- **Never override `--menu-top-level-font-size`.** That variable is shared with the mobile drawer, which deliberately renders at `--menu-font-2xl--size` (`snippets/menu-font-styles.liquid:17`). Overriding it shrinks the drawer's nav to 15px. Desktop reads `--menu-top-level-font-size-desktop` instead (`blocks/_header-menu.liquid:323`).
- **Token values are never hardcoded.** Always reference `var(--text-role-label-lg-*)` / `var(--color-blau-sitges)` from `assets/design-tokens.css`, which is already loaded and preloaded (`snippets/stylesheets.liquid:1`).
- **`shopify theme check` must pass** before any task is considered done.

## Out of scope

Do not implement these. They are deliberate exclusions recorded in the spec; adding them is a plan violation:

- The cart bubble (it stays near-black — not `vermell-segell`).
- The search action.
- The announcement bar (it will not exist on the storefront).
- The compact 230px dropdown card, the ES/CA language pill, the "Sant Jordi" stamp item.
- Nav text colour (stays Horizon's `--color-foreground`).

## Background: how Horizon builds the nav

Reference only — do not edit these files.

`snippets/menu-font-styles.liquid` renders into a `style="..."` attribute on the `<nav class="menu-list">` element, declaring:

```
--menu-top-level-font-family:       var(--font-<type_font_primary_link>--family)
--menu-top-level-font-weight:       var(--font-<type_font_primary_link>--weight)
--menu-top-level-font-size-desktop: <type_font_primary_size>          /* from settings */
--menu-top-level-font-size:         var(--menu-font-sm--size)         /* mega_menu  */
--menu-top-level-font-size:         var(--menu-font-2xl--size)        /* drawer     */
--menu-top-level-font-line-height:  var(--menu-font-sm--line-height)
--menu-top-level-font-color:        var(--color-foreground)
```

`blocks/_header-menu.liquid:287-325` consumes them:

```css
.menu-list__link {
  font-weight: var(--menu-top-level-font-weight);
  font-size:   var(--menu-top-level-font-size);
  line-height: var(--menu-top-level-font-line-height);
  color:       var(--menu-top-level-font-color);

  &:hover, &:focus { color: var(--menu-top-level-font-color); }

  @media screen and (min-width: 750px) {
    font-size: var(--menu-top-level-font-size-desktop);   /* desktop wins here */
  }
}
```

**Why declaring the variable on `.menu-list__link` works:** the variables are set *inline on the parent* `<nav>` and reach the link by **inheritance**. A direct declaration on the link element itself beats an inherited value regardless of stylesheet order or specificity. This is why the bridge does not need to out-specify the block.

---

### Task 1: Point the nav at the `subheading` font slot

Delivers nav weight 600 from a real `archivo_n6` face. Pure settings change — no CSS.

**Files:**
- Modify: `sections/header-group.json` (the `header-menu` block's settings)

**Interfaces:**
- Consumes: nothing.
- Produces: `--menu-top-level-font-weight` resolves to `var(--font-subheading--weight)` = 600, and `--menu-top-level-font-family` to `var(--font-subheading--family)` = Archivo. Task 2 relies on weight being delivered here and NOT in CSS.

**Intended side-effect:** this also flips the **mobile drawer's** weight to 600 — `snippets/header-drawer.liquid:1052` reads the same `--menu-top-level-font-weight`. That is wanted (the drawer should share the nav's brand weight) and is why Task 2 does not need to touch drawer weight. It is called out so it is intended, not discovered.

**Why not CSS:** Horizon `font_face`s only each slot's own weight plus its bold (`snippets/theme-styles-variables.liquid:45-51`). The loaded Archivo faces are 400, 600 and 700 — never 500. A CSS `font-weight: 500` would match the 400 face under CSS font matching and render *lighter* than intended. The `label-lg` token's 500 is recorded-but-not-delivered by design.

- [ ] **Step 1: Read the current setting**

Run:
```bash
grep -n '"type_font_primary_link"' sections/header-group.json
```

Expected: `"type_font_primary_link": "body",`

- [ ] **Step 2: Change the slot from `body` to `subheading`**

In `sections/header-group.json`, inside `sections.header_section.blocks.header-menu.settings`, change:

```json
            "type_font_primary_link": "body",
```

to:

```json
            "type_font_primary_link": "subheading",
```

Leave `type_font_primary_size` (`"0.875rem"`) and `type_case_primary_link` (`"none"`) exactly as they are. Task 2 makes the size setting inert; the case setting stays correct.

- [ ] **Step 3: Verify the file is still valid JSON**

Run:
```bash
python3 -c "import json,re; s=open('sections/header-group.json').read(); s=re.sub(r'/\*.*?\*/','',s,flags=re.S); d=json.loads(s); print(d['sections']['header_section']['blocks']['header-menu']['settings']['type_font_primary_link'])"
```

Expected output: `subheading`

(The `re.sub` strips the auto-generated banner comment at the top of the file, which is not valid JSON.)

- [ ] **Step 4: Verify the theme still checks**

Run: `shopify theme check`
Expected: no new errors introduced by this change.

- [ ] **Step 5: Verify the rendered weight in the browser**

Run: `shopify theme dev`

In the storefront at a viewport ≥750px, inspect a top-level nav link (`.menu-list__link`):

1. Computed `font-weight` is `600`.
2. Computed `font-family` begins with `Archivo`.
3. **In the Network tab, filter for `woff2` and confirm an `archivo` face at weight 600 is downloaded.** This is the point of the task — a computed 600 with no 600 face loaded would be a synthesized weight, which is the failure this design exists to avoid.

Do NOT commit (see Global Constraints).

---

### Task 2: Add the header bridge

Delivers nav size 15px, tracking 0.02em, and the `blau-sitges` hover.

**Files:**
- Create: `snippets/header-bridge.liquid`
- Modify: `layout/theme.liquid:32` (add one `{% render %}` line after `design-system-bridge`)

**Interfaces:**
- Consumes: Task 1's `subheading` slot (weight/family arrive from settings; this task must NOT set `font-weight` or `font-family`).
- Consumes: `assets/design-tokens.css`, already loaded via `snippets/stylesheets.liquid:1`. Tokens used, all verified present:
  - `--text-role-label-lg-font-size: 15px`
  - `--text-role-label-lg-line-height: 20px`
  - `--text-role-label-lg-letter-spacing: 0.02em`
  - `--color-blau-sitges: #0b078c`
- Produces: nothing consumed by later tasks.

- [ ] **Step 0: Confirm the bound menu can actually be verified against**

Do this **before** writing any code. Steps 5–8 observe rendered `.menu-list__link` elements; if the bound link list is empty, the header renders bare and you cannot distinguish "bridge broken" from "no menu items".

Run:
```bash
grep -n '"menu"' sections/header-group.json
```

Expected: `"menu": "menu-temp",`

Then run `shopify theme dev` and confirm, before changing anything:

1. The header renders **top-level nav links** at all.
2. **At least one** has a nested submenu (hovering it opens a mega-menu panel).

If either is false, STOP and tell the user: the `menu-temp` link list needs items — including one nested child list — configured in Shopify admin first. That is admin configuration, not code, and no change in this plan can substitute for it.

- [ ] **Step 1: Confirm the tokens exist before referencing them**

Run:
```bash
grep -n "text-role-label-lg\|color-blau-sitges" assets/design-tokens.css
```

Expected: five lines — `--text-role-label-lg-font-size: 15px;`, `-line-height: 20px;`, `-font-weight: 500;`, `-letter-spacing: 0.02em;`, and `--color-blau-sitges: #0b078c;`.

If any are missing, STOP: `assets/design-tokens.css` is out of sync. Run `npm run tokens:sync` and re-check.

- [ ] **Step 2: Create the bridge snippet**

Create `snippets/header-bridge.liquid` with exactly this content:

```liquid
{% comment %}
  Brings the header nav to the Mionas design system's label-lg role, using tokens from
  assets/design-tokens.css.

  Rendered from theme.liquid AFTER design-system-bridge.

  WHY THIS DECLARES VARIABLES RATHER THAN font-size/color:
  blocks/_header-menu.liquid emits its {% style %} in the BODY, i.e. later in the document
  than this snippet, which renders in <head>. At equal specificity those rules would win.
  Horizon sets its --menu-top-level-* variables inline on the parent <nav class="menu-list">,
  so the link inherits them; declaring the same variables directly on .menu-list__link beats
  inheritance regardless of stylesheet order. letter-spacing is the one exception - Horizon
  derives no variable for it and sets no competing rule, so it is set as a property.

  WHY ONLY THE -desktop SIZE VARIABLE:
  --menu-top-level-font-size is shared with the mobile drawer, which deliberately renders at
  --menu-font-2xl--size (snippets/menu-font-styles.liquid:17). Overriding it would shrink the
  drawer's nav to 15px. Desktop links read --menu-top-level-font-size-desktop instead, inside a
  min-width:750px query (blocks/_header-menu.liquid:323).

  The two are otherwise cleanly separated: .menu-list__link does not appear in
  header-drawer.liquid at all (the drawer uses .menu-drawer__menu-item--mainlist), so the
  declarations above cannot leak into mobile.

  WEIGHT AND FAMILY ARE DELIBERATELY ABSENT:
  they come from the subheading font slot (type_font_primary_link in header-group.json), so
  Shopify keeps hosting and preloading a real Archivo 600 face. Archivo 500 is never loaded, so
  a CSS font-weight:500 would match the 400 face and render lighter than intended.
{% endcomment %}
{% style %}
  /* Top-level nav links -> label-lg (15 / 20 / 0.02em). Weight 600 comes from the slot. */
  .menu-list__link {
    --menu-top-level-font-size-desktop: var(--text-role-label-lg-font-size);
    --menu-top-level-font-line-height: var(--text-role-label-lg-line-height);

    letter-spacing: var(--text-role-label-lg-letter-spacing);
  }

  /* Horizon has no menu hover-colour setting. It applies
     `color: var(--menu-top-level-font-color)` on :hover, so re-pointing the variable on the
     hovered element is enough - no need to out-specify its colour rule. */
  .menu-list__link:hover,
  .menu-list__link:focus {
    --menu-top-level-font-color: var(--color-blau-sitges);
  }

  /* Drawer main-list items share the nav's tracking. Size is deliberately untouched: the
     drawer renders at --menu-font-2xl--size by Horizon's design and the prototype has no
     mobile reference to match. */
  .menu-drawer__menu-item--mainlist {
    letter-spacing: var(--text-role-label-lg-letter-spacing);
  }
{% endstyle %}
```

- [ ] **Step 3: Render the bridge from theme.liquid**

In `layout/theme.liquid`, find line 32:

```liquid
    {%- render 'design-system-bridge' -%}
```

Add one line immediately after it:

```liquid
    {%- render 'design-system-bridge' -%}
    {%- render 'header-bridge' -%}
```

This is the only permitted upstream edit. Do not change anything else in `theme.liquid`.

- [ ] **Step 4: Verify the theme checks**

Run: `shopify theme check`
Expected: no new errors. In particular no "unknown snippet" error for `header-bridge`.

- [ ] **Step 5: Verify the desktop nav renders at label-lg**

Run: `shopify theme dev`

At a viewport **≥750px**, inspect a top-level nav link (`.menu-list__link`):

| Property | Expected |
| --- | --- |
| `font-size` | `15px` |
| `line-height` | `20px` |
| `letter-spacing` | `0.3px` (0.02em × 15px) |
| `font-weight` | `600` (from Task 1) |
| `font-family` | `Archivo…` |

- [ ] **Step 6: Verify the hover colour**

Hover a top-level nav link. Computed `color` becomes `rgb(11, 7, 140)` (`#0b078c`).

If the colour does not change, the variable is not being picked up — check that `header-bridge` is rendered **after** `design-system-bridge` and that the rule targets `.menu-list__link:hover`, not `.menu-list:hover`.

- [ ] **Step 7: Verify the drawer was NOT shrunk**

This is the regression this task's design exists to prevent.

At a viewport **<750px**, open the mobile drawer and inspect `.menu-drawer__menu-item--mainlist`:

1. `font-size` is **NOT** `15px` — it still resolves from `--menu-font-2xl--size` (a large size).
2. `letter-spacing` is `0.02em` × that size.
3. The drawer opens, is legible, and there is no horizontal overflow at 375px.

If the drawer's links render at 15px, the bridge has wrongly overridden `--menu-top-level-font-size`. Remove that declaration.

- [ ] **Step 8: Verify the submenu is unaffected**

Hover a nav item that has a nested link list. The mega-menu panel opens and its background is cream (`#FFF8F0`) — unchanged by this work.

- [ ] **Step 9: Verify no Google Fonts request**

In the Network tab, confirm there is no request to `fonts.googleapis.com`. Shopify self-hosts the font-slot faces.

Do NOT commit (see Global Constraints).

---

## READ BEFORE ANY BROWSER VERIFICATION

**Emulated touch forces the drawer, at any viewport width.** `assets/utilities.js:783` sets:

```js
headerComponent.dataset.menuStyle = isTouchDevice() || hasReachedMinimum ? 'drawer' : 'menu';
```

and `isTouchDevice()` (`assets/utilities.js:432`) is `'ontouchstart' in window && navigator.maxTouchPoints > 0`
— **true in Chrome DevTools device/responsive emulation**.

Consequences for every "at a viewport ≥750px" step below (Task 1 Step 5; Task 2 Steps 5, 6, 8):

- Verify with a **real non-touch pointer**, or in DevTools with **touch emulation off**. Resizing
  the window is fine; device-emulation mode is not.
- In device emulation you will see the drawer instead of the nav, and `.menu-list__link` will not
  exist. That is Horizon behaving correctly — **not** a broken bridge.
- The second clause matters too: `hasReachedMinimum` means that if the nav items **overflow** the
  available width, Horizon collapses the whole nav to the drawer. If the desktop nav is missing at
  a genuinely wide, non-touch viewport, suspect overflow before suspecting the bridge.

## Known gaps after this plan

Expected outcomes, not bugs — do not "fix" them:

- **The theme editor shows a stale nav size.** `type_font_primary_size` remains `0.875rem` (14px) while the nav renders 15px. The size enum has no 15, which is why the bridge exists. Same accepted cost as h2/h3/h4 in the typography spec.
- **The nav depends on admin configuration.** `header-group.json` points the menu block at `menu-temp`. Until a real `link_list` exists in admin with "Tienda / Regalos / Ocasiones / Empresas / Cursos / Nosotros" and Tienda's nested submenu, the styling has nothing correct to style. This is admin work, not code.
- **`header-group.json` is admin-generated.** A theme-editor save can revert Task 1. The bridge CSS is unaffected. Unresolved until the pull→push move.
- **The bridge targets upstream selectors with no guard.** `.menu-list__link`, `.menu-drawer__menu-item--mainlist` and the `--menu-top-level-*` variables are Horizon's private structure. A theme update can rename them and the styling silently reverts. `scripts/design-tokens-contract.mjs` guards token names but nothing guards selectors. See the follow-up below.

## Suggested follow-up (not in this plan)

The spec names a cheap mitigation for the softest joint: extend the sync script to assert that `blocks/_header-menu.liquid` still contains the selectors and variables the bridge depends on, failing loudly on a theme update that renames them. Deliberately not implemented here — it is its own piece of work, and it guards the theme rather than delivering the brand.
