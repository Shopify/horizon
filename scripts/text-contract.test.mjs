// Guards the traps in blocks/text-role.liquid that no visual check would catch.
// See docs/superpowers/specs/2026-07-20-text-role-block-design.md, "Typography".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const blockPath = resolve(here, "..", "blocks", "text-role.liquid");
const tokensPath = resolve(here, "..", "assets", "design-tokens.css");

const readBlock = () => readFileSync(blockPath, "utf8");
const readTokens = () => readFileSync(tokensPath, "utf8");

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

// Mirrors design-tokens-contract.mjs's DECLARATION_PATTERN -- matches a custom-property
// DECLARATION (`--name:`), not a var() reference.
const DECLARATION_PATTERN = /(?:^|[{;])\s*(--[\w-]+)\s*:/g;

function declaredTokenNames(css) {
  const names = new Set();
  for (const match of css.matchAll(DECLARATION_PATTERN)) {
    names.add(match[1]);
  }
  return names;
}

test("the block never spends the inert design-system font-family strings", () => {
  const block = readBlock();
  assert.equal(
    occurrences(block, "var(--font-family-oswald)"),
    0,
    "--font-family-oswald is an inert string in design-tokens.css; spend --font-accent--family instead"
  );
  assert.equal(
    occurrences(block, "var(--font-family-archivo)"),
    0,
    "--font-family-archivo is an inert string in design-tokens.css; spend --font-body--family instead"
  );
});

test("the stamp role spends the theme's loaded accent font", () => {
  const block = readBlock();
  assert.ok(
    block.includes("var(--font-accent--family)"),
    "the stamp role must use --font-accent--family, which theme-styles-variables.liquid emits from settings.type_accent_font and Shopify preloads"
  );
});

test("the base class spends the theme's loaded body font", () => {
  const block = readBlock();
  const match = block.match(/\.text-role\s*{[^}]*}/);
  assert.ok(match, "expected a .text-role base rule");
  assert.ok(
    match[0].includes("var(--font-body--family)"),
    "the base .text-role rule must set font-family from --font-body--family, so every role (except stamp) resolves to the theme's loaded body font regardless of the rendered tag"
  );
});

test("no colour is hardcoded", () => {
  const block = readBlock();
  const hexes = block.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(
    hexes,
    [],
    `every colour must come from var(--text-color-*); found ${hexes.join(", ")}`
  );
});

test("the block never spends the unexposed secondary colour variant", () => {
  const block = readBlock();
  assert.equal(
    occurrences(block, "var(--text-color-secondary)"),
    0,
    "--text-color-secondary exists in design-tokens.css but is not part of Text.tsx's TextVariant type; this block must stay faithful to the component's exposed variants"
  );
});

test("every --text-role-* / --text-color-* var() the block spends is a real declared token", () => {
  const block = readBlock();
  const declared = declaredTokenNames(readTokens());
  const referenced = new Set();
  for (const match of block.matchAll(/var\((--text-(?:role|color)-[\w-]+)/g)) {
    referenced.add(match[1]);
  }
  assert.ok(referenced.size > 0, "expected the block to reference at least one text token");
  const missing = [...referenced].filter((name) => !declared.has(name));
  assert.deepEqual(
    missing,
    [],
    `every var(--text-role-*)/var(--text-color-*) reference must exist in assets/design-tokens.css; missing: ${missing.join(", ")}`
  );
});

test("the block never spends a letter-spacing token that upstream Horizon redeclares", () => {
  const block = readBlock();
  assert.equal(occurrences(block, "var(--letter-spacing-md)"), 0, "--letter-spacing-md resolves to upstream Horizon's value, not the design system's; spend --text-role-*-letter-spacing");
  assert.equal(occurrences(block, "var(--letter-spacing-sm)"), 0, "--letter-spacing-sm resolves to upstream Horizon's value, not the design system's");
});
