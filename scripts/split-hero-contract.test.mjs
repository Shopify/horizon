// Guards the two static traps in blocks/split-hero.liquid that no visual check would catch.
// See docs/superpowers/specs/2026-07-17-split-hero-block-design.md, "Typography" and "The two
// colours with no token".
//
// Neither of these is a rendering test -- the theme has no Liquid rendering harness. They assert
// properties of the source that are invisible in a screenshot: a font that silently falls back, and
// a hardcoded colour quietly spreading to more use sites.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const blockPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "blocks",
  "split-hero.liquid"
);

const readBlock = () => readFileSync(blockPath, "utf8");

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

test("the eyebrow spends the theme's loaded accent font, not the inert token string", () => {
  const block = readBlock();
  assert.ok(
    block.includes("var(--font-accent--family)"),
    "the eyebrow must use --font-accent--family, which theme-styles-variables.liquid emits from settings.type_accent_font (oswald_n6) and Shopify preloads"
  );
  // Matches the use site -- var(--font-family-oswald) -- not the bare name, so the stylesheet
  // comment explaining why the token is wrong does not trip its own guard. Spending the token is
  // the defect; naming it in prose is the documentation that prevents the defect.
  assert.equal(
    occurrences(block, "var(--font-family-oswald)"),
    0,
    "--font-family-oswald is an inert string in design-tokens.css; a custom property loads no font. It renders Oswald only by coincidence and falls back to Arial Narrow the moment the accent font setting changes."
  );
});

test("each untokenised brand colour is declared exactly once", () => {
  const block = readBlock();
  assert.equal(
    occurrences(block, "#f7f2e3"),
    1,
    "the beige panel colour must be declared once as a block-local custom property, so it is one line to swap when ../design-system emits --color-beige-vainilla"
  );
  assert.equal(
    occurrences(block, "#ffd9b0"),
    1,
    "the eyebrow-on-dark colour must be declared once as a block-local custom property, for the same reason"
  );
});

test("no other colour is hardcoded", () => {
  const block = readBlock();
  const hexes = block.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const unexpected = hexes.filter((hex) => !["#f7f2e3", "#ffd9b0"].includes(hex.toLowerCase()));
  assert.deepEqual(
    unexpected,
    [],
    `every other colour must come from a token; found ${unexpected.join(", ")}`
  );
});

test("the block never spends a letter-spacing token that upstream Horizon redeclares", () => {
  const block = readBlock();
  // theme-styles-variables.liquid:155-156 (upstream, unmodifiable) declares these names with
  // different values than the design system, in an inline <style> that renders after
  // design-tokens.css. Spending either silently yields upstream's value, not the design's.
  assert.equal(occurrences(block, "var(--letter-spacing-md)"), 0, "--letter-spacing-md resolves to upstream Horizon's 0.13em, not the design system's 0.05em; spend --text-role-stamp-letter-spacing");
  assert.equal(occurrences(block, "var(--letter-spacing-sm)"), 0, "--letter-spacing-sm resolves to upstream Horizon's 0.06em, not the design system's 0.02em");
});
