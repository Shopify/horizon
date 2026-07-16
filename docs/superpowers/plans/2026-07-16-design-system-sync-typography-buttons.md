# Design System Sync — Typography & Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Horizon storefront's typography and buttons from the Mionas design system's built tokens, replacing the theme's hand-set Inter type with the brand's Archivo/Oswald scale.

**Architecture:** Build the `../design-system` sibling repo and copy its `dist/tokens.css` verbatim into `assets/design-tokens.css` (committed), mirroring the existing `mionas-app/scripts/sync-design-tokens.mjs` precedent. A new `snippets/design-system-bridge.liquid`, rendered after Horizon's own `theme-styles-variables`, re-points three final CSS variables per type preset at those tokens. Font families and casing go through native Shopify settings instead, so Shopify self-hosts and preloads the brand faces.

**Tech Stack:** Shopify Liquid (Horizon theme), Node.js 24 (`node --test`, built-in — no test dependencies added), Shopify CLI 4.3.0.

**Spec:** `docs/superpowers/specs/2026-07-16-design-system-sync-typography-buttons-design.md`

## Prerequisite — this plan is blocked

**Do not start Task 2 until the design-system extension has shipped.** `../design-system` currently
cannot express the target: it has no Oswald token, `font-size.xl` is 32px where `display-lg` is
48px, and it has no per-role `line-height` or `letter-spacing` tokens at all. That extension is a
separate spec in that repo, governed by `../design-system/CLAUDE.md`.

Task 1 is pure Node and can be completed now. Tasks 2–5 require the extension.

**Confirm before Task 2:** the design-system spec owns the token *names*. This plan uses the names
implied by that repo's existing bundled-role convention (`type.<role>.<property>` →
`--type-<role>-<property>`). If that spec chose different names, change them in **one place** —
`REQUIRED_TOKENS` in `scripts/design-tokens-contract.mjs` — and in the bridge snippet's `var()`
references. Nothing else hardcodes a token name.

## Global Constraints

- **The bridge overrides exactly three variables per preset:** `--size`, `--line-height`, `--letter-spacing`. Never `--family`, `--weight`, `--style` or `--case` — those come from Shopify settings, and overriding `--family` in CSS would hardcode Archivo and defeat Shopify's font hosting and preloading.
- **Never edit `snippets/theme-styles-variables.liquid`.** It is upstream Shopify code that changes on every theme update; every commit on `main` is "Update from Shopify for theme horizon/main". All overrides live in the new bridge snippet.
- **Never edit `config/settings_schema.json`.** Overriding final variables downstream makes forking the schema unnecessary.
- **`assets/design-tokens.css` is generated.** Never hand-edit it. It is produced only by `npm run tokens:sync` and copied verbatim, retaining the design system's own "AUTO-GENERATED" header.
- **Out of scope:** colours (the palette already matches the brand), button radius (already pill `100`), and the design system's `outline`/`ghost`/`danger`/`inverse` button variants (Horizon renders no colour-variant buttons).
- **Shopify uploads only** `assets/ blocks/ config/ layout/ locales/ sections/ snippets/ templates/`. `package.json` and `scripts/` stay local and never ship to the store.
- **Work on the `design-system-sync` branch**, not `main`. `main` is the Shopify pull target.

## The mapping (single source of truth for Tasks 1 and 3)

| Horizon preset | DS role | Rendered |
| --- | --- | --- |
| `h1` | `display-lg` | 48 / 58 / 700 · uppercase · 0.02em |
| `h2` | `display-md` | 36 / 44 / 700 · uppercase · 0.02em |
| `h3` | `heading-lg` | 28 / 36 / 700 · uppercase · 0.02em |
| `h4` | `heading-md` | 22 / 28 / 700 · uppercase · 0.02em |
| `h5` | `heading-sm` | 18 / 24 / 600 · uppercase · 0.02em |
| `h6` | `heading-sm` | 18 / 24 / 600 · uppercase · 0.02em (identical to h5, intentional) |
| `paragraph` | `body-md` | 16 / 24 / 400 · sentence case · 0 tracking |

Six roles × three properties = **18 required tokens**.

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Create. Minimal, private. Declares `tokens:sync` and `test`. |
| `scripts/design-tokens-contract.mjs` | Create. The contract: the 18 required token names + a pure function reporting which are missing from a CSS string. Sole owner of token names. |
| `scripts/design-tokens-contract.test.mjs` | Create. Unit tests for the above. |
| `scripts/sync-design-tokens.mjs` | Create. Build the sibling repo, copy the artifact, validate, fail loudly. I/O only — no contract knowledge. |
| `assets/design-tokens.css` | Generated + committed. The copied artifact. |
| `snippets/design-system-bridge.liquid` | Create. Maps Horizon's final type vars to DS tokens. |
| `snippets/stylesheets.liquid` | Modify. Link the tokens asset. |
| `layout/theme.liquid` | Modify. One `{% render %}` line. |
| `config/settings_data.json` | Modify. Font slots + casing. |

The contract is split from the sync script so the token names are unit-testable without running a
build of the sibling repo, and so a name change touches one file.

---

### Task 1: Token contract and validator

Pure Node, no design-system build required. **Can be done before the prerequisite lands.**

**Files:**
- Create: `package.json`
- Create: `scripts/design-tokens-contract.mjs`
- Test: `scripts/design-tokens-contract.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `REQUIRED_TOKENS: string[]` — the 18 CSS custom-property names, each including the leading `--`.
  - `findMissingTokens(css: string, required?: string[]): string[]` — returns the subset of `required` **not declared** in `css`. A token that is only *referenced* via `var(...)` does not count as declared.

- [ ] **Step 1: Create the theme's package.json**

Horizon has no `package.json` today. This one is private and never uploaded to Shopify.

```json
{
  "name": "horizon-theme",
  "private": true,
  "scripts": {
    "tokens:sync": "node scripts/sync-design-tokens.mjs",
    "test": "node --test \"scripts/*.test.mjs\""
  }
}
```

The glob is deliberate. `node --test scripts/` **does not work** on Node 22+ — a path argument is
treated as a module to load, not a directory to scan, and it fails with `MODULE_NOT_FOUND`.

- [ ] **Step 2: Write the failing test**

Create `scripts/design-tokens-contract.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { REQUIRED_TOKENS, findMissingTokens } from "./design-tokens-contract.mjs";

const cssDeclaring = (names) =>
  `:root {\n${names.map((n) => `  ${n}: 1px;`).join("\n")}\n}\n`;

test("the contract covers six roles across three properties", () => {
  assert.equal(REQUIRED_TOKENS.length, 18);
  assert.ok(REQUIRED_TOKENS.every((name) => name.startsWith("--type-")));
  assert.equal(new Set(REQUIRED_TOKENS).size, 18, "no duplicates");
});

test("returns nothing when every required token is declared", () => {
  assert.deepEqual(findMissingTokens(cssDeclaring(REQUIRED_TOKENS)), []);
});

test("reports the tokens that are absent", () => {
  const css = cssDeclaring(REQUIRED_TOKENS.slice(1));
  assert.deepEqual(findMissingTokens(css), [REQUIRED_TOKENS[0]]);
});

test("a token that is only referenced does not count as declared", () => {
  const css = `:root {\n  --font-h1--size: var(${REQUIRED_TOKENS[0]});\n}\n`;
  assert.ok(findMissingTokens(css).includes(REQUIRED_TOKENS[0]));
});

test("tolerates the design system's real formatting", () => {
  const css = `/* AUTO-GENERATED by Style Dictionary. Do not edit. */\n:root{\n${REQUIRED_TOKENS.map(
    (n) => `${n}:var(--font-size-md);`
  ).join("\n")}\n}\n`;
  assert.deepEqual(findMissingTokens(css, REQUIRED_TOKENS), []);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `ℹ fail 1` and
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/design-tokens-contract.mjs' imported from .../scripts/design-tokens-contract.test.mjs`

- [ ] **Step 4: Write the contract module**

Create `scripts/design-tokens-contract.mjs`:

```js
// The contract between ../design-system and this theme's snippets/design-system-bridge.liquid.
// These names are the ONLY place the theme hardcodes design-system token names. If the design
// system renames a token, change it here and in the bridge snippet's var() references.

const ROLES = [
  "display-lg", // h1
  "display-md", // h2
  "heading-lg", // h3
  "heading-md", // h4
  "heading-sm", // h5 and h6
  "body-md", // paragraph
];

// Only these three properties are bridged. Family, weight and case come from Shopify settings.
const PROPERTIES = ["font-size", "line-height", "letter-spacing"];

export const REQUIRED_TOKENS = ROLES.flatMap((role) =>
  PROPERTIES.map((property) => `--type-${role}-${property}`)
);

// Matches a custom-property DECLARATION (`--name:`), not a var() reference, so a token that the
// theme merely mentions is never mistaken for one the design system provides.
const DECLARATION_PATTERN = /(?:^|[{;])\s*(--[\w-]+)\s*:/g;

export function findMissingTokens(css, required = REQUIRED_TOKENS) {
  const declared = new Set(
    [...css.matchAll(DECLARATION_PATTERN)].map((match) => match[1])
  );
  return required.filter((token) => !declared.has(token));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `ℹ pass 5`, `ℹ fail 0`

(This exact module and test file were dry-run during planning: all 5 pass on Node 24.16.0.)

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/design-tokens-contract.mjs scripts/design-tokens-contract.test.mjs
git commit -m "Add design-token contract and validator for theme sync"
```

---

### Task 2: Sync script

**Requires the prerequisite.** Builds the sibling repo, so `../design-system` must contain the extended tokens.

**Files:**
- Create: `scripts/sync-design-tokens.mjs`
- Create (generated): `assets/design-tokens.css`

**Interfaces:**
- Consumes: `REQUIRED_TOKENS`, `findMissingTokens` from `./design-tokens-contract.mjs` (Task 1).
- Produces: `assets/design-tokens.css` — the verbatim copy of `../design-system/dist/tokens.css`, consumed by Task 3's `stylesheets.liquid` link.

- [ ] **Step 1: Write the sync script**

Create `scripts/sync-design-tokens.mjs`. This deliberately mirrors `mionas-app/scripts/sync-design-tokens.mjs`; the differences are the artifact (`tokens.css` not `tokens.js`), the absence of a Prettier step (the theme has no formatter), and the added validation.

```js
#!/usr/bin/env node
// Syncs canonical design tokens from the ../design-system sibling repo into the theme.
// Builds @mionasbakery/design-tokens, copies its dist/tokens.css verbatim into
// assets/design-tokens.css (committed), then verifies every token the bridge snippet
// references is present. Run: npm run tokens:sync
import { execSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { REQUIRED_TOKENS, findMissingTokens } from "./design-tokens-contract.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const themeRoot = resolve(scriptDirectory, "..");
const designSystemRoot = resolve(themeRoot, "..", "design-system");
const source = resolve(designSystemRoot, "dist", "tokens.css");
const destination = resolve(themeRoot, "assets", "design-tokens.css");

console.log("Building design tokens in", designSystemRoot);
execSync("npm run build", { cwd: designSystemRoot, stdio: "inherit" });

copyFileSync(source, destination);

const missing = findMissingTokens(readFileSync(destination, "utf8"));
if (missing.length > 0) {
  console.error(
    `\nERROR: ${missing.length} token(s) required by snippets/design-system-bridge.liquid are missing from ${source}:`
  );
  for (const token of missing) console.error(`  ${token}`);
  console.error(
    "\nThe design system must expose these before the theme can render brand typography."
  );
  process.exit(1);
}

console.log(
  `Synced design tokens -> ${destination} (${REQUIRED_TOKENS.length} required tokens present)`
);
```

- [ ] **Step 2: Run the sync**

Run: `npm run tokens:sync`
Expected: the design-system build output, then
`Synced design tokens -> /Users/marc/projects/horizon/assets/design-tokens.css (18 required tokens present)`

If it exits non-zero listing missing tokens, the prerequisite has not fully landed. Stop and
resolve that in `../design-system` — do not hand-edit `assets/design-tokens.css`.

- [ ] **Step 3: Verify the loud-failure path**

This proves spec verification item 2. Temporarily corrupt one token name and confirm the script refuses to pass:

```bash
sed -i '' 's/--type-display-lg-font-size:/--type-display-lg-fontsize:/' assets/design-tokens.css
node -e "import('./scripts/design-tokens-contract.mjs').then(async (m) => {
  const css = (await import('node:fs')).readFileSync('assets/design-tokens.css', 'utf8');
  const missing = m.findMissingTokens(css);
  console.log(missing.length === 1 && missing[0] === '--type-display-lg-font-size' ? 'PASS: missing token detected' : 'FAIL: ' + JSON.stringify(missing));
})"
```

Expected: `PASS: missing token detected`

Then restore the file: `npm run tokens:sync`

- [ ] **Step 4: Confirm the artifact is a verbatim copy**

Run: `diff ../design-system/dist/tokens.css assets/design-tokens.css && echo "IDENTICAL"`
Expected: `IDENTICAL`

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-design-tokens.mjs assets/design-tokens.css
git commit -m "Sync design tokens into theme assets"
```

---

### Task 3: The bridge snippet

**Files:**
- Create: `snippets/design-system-bridge.liquid`
- Modify: `snippets/stylesheets.liquid`
- Modify: `layout/theme.liquid:31`

**Interfaces:**
- Consumes: the 18 `--type-*` custom properties from `assets/design-tokens.css` (Task 2).
- Produces: overridden `--font-<preset>--size`, `--font-<preset>--line-height`, `--font-<preset>--letter-spacing` for `h1`–`h6` and `paragraph`. Nothing later depends on these by name; `assets/base.css` already consumes them.

- [ ] **Step 1: Link the tokens asset**

Modify `snippets/stylesheets.liquid`. Add the tokens link **before** `base.css` so the theme's own stylesheet can rely on the custom properties existing:

```liquid
{{ 'design-tokens.css' | asset_url | stylesheet_tag: preload: true }}
{{ 'overflow-list.css' | asset_url | preload_tag: as: 'style' }}
{{ 'base.css' | asset_url | stylesheet_tag: preload: true }}
```

- [ ] **Step 2: Write the bridge snippet**

Create `snippets/design-system-bridge.liquid`.

Only `--size`, `--line-height` and `--letter-spacing` appear here. `--family`, `--weight` and
`--case` are intentionally absent — they come from Shopify settings (Task 4).

```liquid
{% comment %}
  Overrides Horizon's final type variables with Mionas design-system tokens from
  assets/design-tokens.css.

  Rendered AFTER theme-styles-variables so these declarations win the cascade.

  Only size, line-height and letter-spacing are bridged: they are the only three values
  Shopify settings cannot express (the size enum has no 36/28/22, line-heights are ratios,
  and tracking is capped at +/-0.03em where the brand needs 0.02em). Family, weight and case
  come from the theme's font settings so Shopify keeps hosting and preloading the faces.

  Token names are mirrored in scripts/design-tokens-contract.mjs, which fails the sync if any
  of them stop existing.
{% endcomment %}
{% style %}
  :root {
    /* h1 -> display-lg. The only preset at Horizon's 48px fluid cutoff, so the only one that
       keeps a clamp(). The token supplies the maximum; 4.8vw is Horizon's value * 0.1vw ratio
       for a 48px preset, and 2.75rem (44px) is Horizon's derived minimum for a configured size
       set of {16,18,24,32,40,48} (next size down is 40, under the cutoff, so 40 + 4). */
    --font-h1--size: clamp(2.75rem, 4.8vw, var(--type-display-lg-font-size));
    --font-h1--line-height: var(--type-display-lg-line-height);
    --font-h1--letter-spacing: var(--type-display-lg-letter-spacing);

    /* h2 -> display-md. Below the fluid cutoff, so fixed. */
    --font-h2--size: var(--type-display-md-font-size);
    --font-h2--line-height: var(--type-display-md-line-height);
    --font-h2--letter-spacing: var(--type-display-md-letter-spacing);

    /* h3 -> heading-lg */
    --font-h3--size: var(--type-heading-lg-font-size);
    --font-h3--line-height: var(--type-heading-lg-line-height);
    --font-h3--letter-spacing: var(--type-heading-lg-letter-spacing);

    /* h4 -> heading-md */
    --font-h4--size: var(--type-heading-md-font-size);
    --font-h4--line-height: var(--type-heading-md-line-height);
    --font-h4--letter-spacing: var(--type-heading-md-letter-spacing);

    /* h5 -> heading-sm */
    --font-h5--size: var(--type-heading-sm-font-size);
    --font-h5--line-height: var(--type-heading-sm-line-height);
    --font-h5--letter-spacing: var(--type-heading-sm-letter-spacing);

    /* h6 -> heading-sm. Intentionally identical to h5: the target design has no sixth heading
       level, and keeping h6 a true heading beats demoting it to a label. */
    --font-h6--size: var(--type-heading-sm-font-size);
    --font-h6--line-height: var(--type-heading-sm-line-height);
    --font-h6--letter-spacing: var(--type-heading-sm-letter-spacing);

    /* paragraph -> body-md */
    --font-paragraph--size: var(--type-body-md-font-size);
    --font-paragraph--line-height: var(--type-body-md-line-height);
    --font-paragraph--letter-spacing: var(--type-body-md-letter-spacing);
  }
{% endstyle %}
```

- [ ] **Step 3: Render the bridge**

Modify `layout/theme.liquid`. Add one line immediately after the `theme-styles-variables` render
(currently line 31). `color-palette` contains no font references, so this position is safe:

```liquid
    {%- render 'theme-styles-variables' -%}
    {%- render 'design-system-bridge' -%}
    {%- render 'color-palette' -%}
```

- [ ] **Step 4: Validate the Liquid**

Run: `shopify theme check`
Expected: no errors for `snippets/design-system-bridge.liquid`, `snippets/stylesheets.liquid` or `layout/theme.liquid`.

- [ ] **Step 5: Confirm every token the bridge references is under contract**

This catches a typo in the bridge that the validator would otherwise not know about:

```bash
grep -o '\-\-type-[a-z-]*' snippets/design-system-bridge.liquid | sort -u > /tmp/bridge-tokens.txt
node -e "import('./scripts/design-tokens-contract.mjs').then(m => console.log(m.REQUIRED_TOKENS.sort().join('\n')))" > /tmp/contract-tokens.txt
diff /tmp/bridge-tokens.txt /tmp/contract-tokens.txt && echo "BRIDGE MATCHES CONTRACT"
```

Expected: `BRIDGE MATCHES CONTRACT`

- [ ] **Step 6: Commit**

```bash
git add snippets/design-system-bridge.liquid snippets/stylesheets.liquid layout/theme.liquid
git commit -m "Bridge Horizon type variables to design-system tokens"
```

---

### Task 4: Font slots and casing

**Files:**
- Modify: `config/settings_data.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the `--font-{body,subheading,heading,accent}--family` and `--font-h*--case` values that Horizon's `theme-styles-variables` emits, which the bridge deliberately does not override.

Weight needs no work: it follows the font slot. `type_font_h1`–`h4` are already `heading`
(`archivo_n7` = 700) and `type_font_h5`–`h6` already `subheading` (`archivo_n6` = 600); paragraph
weight is hardcoded to 400 by Horizon and the `body` slot is `archivo_n4`. Every target weight is
already met.

- [ ] **Step 1: Repoint the four font slots**

In `config/settings_data.json`, under `"current"`, change:

```json
    "type_body_font": "archivo_n4",
    "type_subheading_font": "archivo_n6",
    "type_heading_font": "archivo_n7",
    "type_accent_font": "oswald_n6",
```

(Was `inter_n4`, `inter_n5`, `inter_n7`, `inter_n7`.) All four handles are confirmed present in
Shopify's font library: `archivo_n1`–`n9` and `oswald_n2`–`n7`. `oswald_n6` is the stamp face;
nothing in this typography scope consumes it yet, but it belongs on the `accent` slot so the two
systems agree.

- [ ] **Step 2: Set uppercase on every heading**

`type_case_h1`, `type_case_h2` and `type_case_h3` already exist with value `"none"` — change them
to `"uppercase"`. `type_case_h4`, `type_case_h5` and `type_case_h6` are **absent** and must be
added (they currently fall back to the schema default of `"none"`):

```json
    "type_case_h1": "uppercase",
    "type_case_h2": "uppercase",
    "type_case_h3": "uppercase",
    "type_case_h4": "uppercase",
    "type_case_h5": "uppercase",
    "type_case_h6": "uppercase",
```

Place each `type_case_hN` key alongside the other `hN` keys, keeping the file's existing grouping.

- [ ] **Step 3: Verify the JSON is well-formed**

`settings_data.json` opens with a comment block, which is legal for Shopify but not for `JSON.parse`. Strip it before checking:

```bash
sed '1,10d' config/settings_data.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const c=j.current;console.log([c.type_body_font,c.type_subheading_font,c.type_heading_font,c.type_accent_font].join(' '));console.log([1,2,3,4,5,6].map(n=>c['type_case_h'+n]).join(' '));})"
```

Expected:
```
archivo_n4 archivo_n6 archivo_n7 oswald_n6
uppercase uppercase uppercase uppercase uppercase uppercase
```

- [ ] **Step 4: Commit**

```bash
git add config/settings_data.json
git commit -m "Point theme fonts at Archivo and Oswald and uppercase headings"
```

---

### Task 5: End-to-end verification

**Files:** none created or modified. This task confirms the spec's verification list against a running storefront.

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: nothing.

- [ ] **Step 1: Start the dev server**

Run: `shopify theme dev`
Expected: a local preview URL.

- [ ] **Step 2: Verify computed typography**

Open the preview. In the browser console on a page with headings and body copy:

```js
const show = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return `${sel}: NOT ON PAGE`;
  const s = getComputedStyle(el);
  return `${sel}: ${s.fontFamily.split(",")[0]} ${s.fontSize} / ${s.lineHeight} w${s.fontWeight} ${s.letterSpacing} ${s.textTransform}`;
};
["h1", "h2", "h3", "p"].forEach((sel) => console.log(show(sel)));
```

Expected at desktop width, per the mapping table: `h1` Archivo 48px / 58px w700 uppercase with
0.96px (0.02em) tracking; `h2` 36px / 44px w700 uppercase; `h3` 28px / 36px w700 uppercase; `p`
Archivo 16px / 24px w400 none, normal tracking.

Any preset showing an Inter fallback or an unexpected size means its `var()` resolved to nothing —
re-run `npm run tokens:sync` and check the token name against `REQUIRED_TOKENS`.

- [ ] **Step 3: Verify no Google Fonts request**

In the Network tab, filter for `fonts.googleapis.com` and reload.
Expected: **zero** requests. The faces load from Shopify's CDN via `font_face`.

- [ ] **Step 4: Verify h1 stays fluid**

Resize the viewport to 375px wide.
Expected: `h1` shrinks below 48px (toward the 44px floor) and the page does **not** scroll
horizontally. Confirm with:

```js
document.documentElement.scrollWidth <= window.innerWidth
```

Expected: `true`

- [ ] **Step 5: Verify buttons**

This plan adds no button-specific code. Buttons inherit their type from `--font-paragraph--*`
(`assets/base.css:1243-1247`), which Task 3 already bridged, and their family from the font slot
via `--button-font-family-primary`. Check a primary button:

```js
const b = document.querySelector(".button");
const s = getComputedStyle(b);
console.log(`${s.fontFamily.split(",")[0]} ${s.fontSize} / ${s.lineHeight} w${s.fontWeight} r${s.borderRadius}`);
```

Expected: `Archivo 16px / 24px w400 r100px` — brand type and the unchanged pill radius.

Note the design system's `--button-*` tokens (`--button-size-md-height`, `--button-state-pressed-scale`
and friends) are intentionally **unused**: Horizon has no `:active` press state to map them onto,
and adding one would be new behaviour rather than a sync.

- [ ] **Step 6: Record the known gap**

No action; confirm the expected discrepancy so it is not later reported as a bug. In the Shopify
theme editor, heading sizes still **display** as 40/32/24 for h2/h3/h4 while the page **renders**
36/28/22. The size enum cannot hold the real values; the bridge overrides them downstream. This is
documented in the spec's Risks section.

- [ ] **Step 7: Commit any incidental fixes**

If Steps 1–6 required corrections, commit them:

```bash
git add -A
git commit -m "Fix issues found in end-to-end typography verification"
```

---

## Notes for the implementer

- **If a `var()` resolves to nothing, the type silently reverts** — CSS custom properties fail
  quietly. That is the single most likely failure here, and why `npm run tokens:sync` validates
  the contract and exits non-zero. Trust the script over eyeballing the page.
- **Do not add the design system as an npm dependency.** It is unpublished (`npm view` returns
  404) and version `0.0.0`. The sibling-repo build-and-copy is the established pattern — see
  `mionas-app/scripts/sync-design-tokens.mjs`.
- **The theme has no formatter and no other tests.** `node --test` is built into Node 24; do not
  add a test framework.
