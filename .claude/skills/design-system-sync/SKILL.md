---
name: design-system-sync
description: >
  Sync the Horizon Shopify theme with the Mionas design system in ../design-system, which is
  always the source of truth. Use this skill whenever the user wants to sync, pull, update, or
  align theme tokens/typography/components with the design system; whenever `npm run tokens:sync`
  fails or design-tokens.css looks stale; whenever the design system has renamed, revalued, added,
  or removed tokens or components (Button, SplitHero, Footer, text roles, colors, spacing) and the
  theme must follow; and whenever editing files that spend design tokens — assets/design-tokens.css,
  snippets/design-system-bridge.liquid, scripts/design-tokens-contract.mjs, or blocks that use
  var(--text-role-*), var(--space-*), var(--color-*), var(--button-*). Also use it when adding a
  new theme block that mirrors a design-system component.
---

# Syncing the Horizon theme with the design system

The sibling repo `../design-system` (npm package `@mionasbakery/design-tokens`) is the **source of
truth** for tokens and component design. The theme adapts to the design system, never the reverse:
when a sync reveals a mismatch, the fix belongs in the theme's contract/bridge/blocks — unless the
design-system change turns out to be accidental, which you confirm in *its* git history before
adapting to it.

## The three layers

| Layer | File(s) | Rule |
|---|---|---|
| Generated tokens | `assets/design-tokens.css` | Never hand-edit. Only `npm run tokens:sync` writes it, copying `../design-system/dist/tokens.flat.css` verbatim. |
| Contract | `scripts/design-tokens-contract.mjs` | The only place the theme hardcodes design-system token names **and values**. Mirrors every token the bridge spends. |
| Spenders | `snippets/design-system-bridge.liquid`, blocks/sections/snippets using `var(--…)` | Reference tokens; must move together with the contract on any rename/revalue. |

The bridge maps design-system text roles onto Horizon's typography variables (`--font-h1--size`
etc.) and fixes button metrics/weight. It renders after `theme-styles-variables`, so it wins the
cascade. Only size, line-height, and letter-spacing are bridged — family, weight, and case stay in
Shopify font settings so Shopify keeps hosting and preloading the faces.

## Routine sync

```sh
npm run tokens:sync   # from the theme root
```

This builds the design system, validates the contract against `dist/tokens.flat.css`, and copies it
into `assets/design-tokens.css` only if validation passes. A failed sync leaves the theme's copy
untouched — that is deliberate; don't work around it.

After any sync that changed `assets/design-tokens.css`, check whether tokens the theme spends
*outside* the bridge changed too (see "Renames are silent outside the contract" below), then verify.

## Interpreting a failed sync

**Missing token** — the design system removed or renamed something the bridge spends.
1. Find what happened: `git -C ../design-system log --oneline -- 'src/tokens*'` and grep
   `dist/tokens.flat.css` for the likely new name.
2. Renamed: update the name in `scripts/design-tokens-contract.mjs` **and** every `var()` reference
   in the theme (bridge + blocks). Removed: decide with the user what the bridge should map that
   slot to now (e.g. when the display family collapsed into `hero`, h1 was re-pointed at the hero
   role).

**Wrong value** — the token exists but doesn't carry the contract's literal.
- If the actual value is a `var(...)` reference: the source was repointed at `dist/tokens.css`
  instead of `dist/tokens.flat.css`. The flat variant exists because the theme declares some of the
  same shared names (e.g. `--letter-spacing-sm`) with different values, and a reference would
  silently resolve to the theme's value. Fix the source path, never the contract.
- If it's a new literal: the design system revalued the token. Confirm it's deliberate (design-system
  git log), then update the expected value in the contract — the contract records the design
  system's current intent; it is not a veto over it. If a bridged derivation depends on the value
  (e.g. `--button-padding-block` is derived from height and line-height), re-check the derivation
  comment still holds.

Never "fix" a failed sync by hand-editing `assets/design-tokens.css` or deleting contract entries
to make it pass. Contract entries are pruned only when the theme genuinely stops spending a token
(that has happened: label/stamp roles were pruned when nothing bridged them).

## Renames are silent outside the contract

The contract only guards bridge tokens. Blocks spend many more —
`blocks/split-hero.liquid` alone uses `--space-*`, `--surface-paper`, `--text-role-stamp-*`,
`--button-inverse-*`, `--color-blau-sitges` — and a stale `var(--old-name)` in a block does not
error; the style just falls back to unset. So after any design-system rename or removal:

```sh
grep -rn 'var(--<old-name>' blocks/ snippets/ sections/ assets/
```

and update every hit. When a block starts spending a token the bridge doesn't, consider whether it
is load-bearing enough to add to `EXPECTED_TOKENS` so future renames fail loudly at sync time.

## Mirroring a design-system component in the theme

Design-system React components (`../design-system/src/react/`) define the look; theme blocks
reproduce it in Liquid + CSS. `blocks/split-hero.liquid` (mirroring `SplitHero`) is the reference
example, with its design doc in `docs/superpowers/specs/`. When creating or updating a mirror:

- Take structure, spacing, colors, and typography from the component's `.module.css` and its
  component tokens — expressed as `var(--…)` references to `assets/design-tokens.css`, not copied
  literals.
- **Fonts are the exception**: spend the theme's loaded font variables (e.g.
  `var(--font-accent--family)`), never design-system `--font-family-*` tokens. Those are inert
  strings in a stylesheet — a custom property loads no font file. They render correctly only by
  coincidence and fall back the moment the theme's font setting changes.
- A design the system hasn't tokenized yet (a color with no token): declare the literal **once** as
  a block-local custom property, and swap it for the token when the design system emits one.
- Guard the traps a screenshot can't show with a `scripts/<block>-contract.test.mjs` (see
  `split-hero-contract.test.mjs`): fonts that silently fall back, literals that must stay
  single-sourced, no other hardcoded colors.

## Verify before done

```sh
npm test              # contract + block contract tests
shopify theme check   # Liquid lint
```

Preview with `shopify theme dev`. Never `shopify theme push` unless explicitly asked — it changes
the live store.
