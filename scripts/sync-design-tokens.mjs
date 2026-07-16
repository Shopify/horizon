#!/usr/bin/env node
// Syncs canonical design tokens from the ../design-system sibling repo into the theme.
// Builds @mionasbakery/design-tokens, reads its dist/tokens.flat.css (the fully
// resolved/flattened variant, with outputReferences disabled), validates it, and only then
// copies it verbatim into assets/design-tokens.css (committed). We deliberately use the flat
// variant rather than dist/tokens.css: the latter emits var() references to shared names like
// --letter-spacing-sm, and the theme declares some of those same names itself (in
// theme-styles-variables.liquid). If the theme's declaration loads after this stylesheet, it
// would silently win and the design-system's var() reference would resolve to the theme's value
// instead of the intended one. Flat, literal values make such collisions inert.
//
// Validation checks two things: every token the bridge snippet references is present, AND every
// one of those tokens carries the exact value the contract expects. Presence alone is not enough
// -- a token can exist, be spelled correctly, and still resolve to the wrong value if the source
// was ever repointed at dist/tokens.css (which would carry var(...) references instead of
// literals). We validate the source before copying so a failed sync leaves the theme's existing
// assets/design-tokens.css untouched. Run: npm run tokens:sync
import { execSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { REQUIRED_TOKENS, findMissingTokens, findWrongValues } from "./design-tokens-contract.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const themeRoot = resolve(scriptDirectory, "..");
const designSystemRoot = resolve(themeRoot, "..", "design-system");
const source = resolve(designSystemRoot, "dist", "tokens.flat.css");
const destination = resolve(themeRoot, "assets", "design-tokens.css");

console.log("Building design tokens in", designSystemRoot);
execSync("npm run build", { cwd: designSystemRoot, stdio: "inherit" });

const sourceCss = readFileSync(source, "utf8");

const missing = findMissingTokens(sourceCss);
const wrong = findWrongValues(sourceCss);

if (missing.length > 0) {
  console.error(
    `\nERROR: ${missing.length} token(s) required by snippets/design-system-bridge.liquid are missing from ${source}:`
  );
  for (const token of missing) console.error(`  ${token}`);
  console.error(
    "\nThe design system must expose these before the theme can render brand typography."
  );
}

if (wrong.length > 0) {
  console.error(
    `\nERROR: ${wrong.length} token(s) in ${source} do not carry the value the contract expects:`
  );
  for (const { token, expected, actual } of wrong) {
    console.error(`  ${token}: expected ${expected}, got ${actual}`);
  }
  console.error(
    "\nThe theme's copy must contain literal values, not references. Make sure the sync is " +
      "reading dist/tokens.flat.css (the flattened variant) and not dist/tokens.css -- a var(...) " +
      "actual almost always means it was repointed at the latter."
  );
}

if (missing.length > 0 || wrong.length > 0) {
  process.exit(1);
}

copyFileSync(source, destination);

console.log(
  `Synced design tokens -> ${destination} (${REQUIRED_TOKENS.length} required tokens verified present and correct)`
);
