// The contract between ../design-system and this theme's snippets/design-system-bridge.liquid:
// every token the bridge spends, and the exact value it must carry.
//
// This is the ONLY place the theme hardcodes design-system token names or values. If the design
// system renames or revalues a token, change it here and in the bridge snippet's var() references.
//
// Values are asserted, not just presence, and that is deliberate. A token can exist, be spelled
// correctly, match the contract by name, and still be wrong: --text-role-*-letter-spacing once
// rendered 0.06em instead of 0.02em because the design system emitted var(--letter-spacing-sm)
// and this theme declares that same name with its own value. Only a value check catches that.
export const EXPECTED_TOKENS = {
  "--text-role-hero-font-size": "38px",
  "--text-role-hero-line-height": "40px",
  "--text-role-hero-font-weight": "800",
  "--text-role-hero-letter-spacing": "0.02em",
  "--text-role-title-font-size": "28px",
  "--text-role-title-line-height": "36px",
  "--text-role-title-letter-spacing": "0.02em",
  "--text-role-heading-font-size": "22px",
  "--text-role-heading-line-height": "28px",
  "--text-role-heading-letter-spacing": "0.02em",
  "--text-role-subheading-font-size": "18px",
  "--text-role-subheading-line-height": "24px",
  "--text-role-subheading-letter-spacing": "0.02em",
  "--text-role-body-font-size": "16px",
  "--text-role-body-line-height": "24px",
  "--text-role-body-letter-spacing": "0",
  "--text-role-label-font-size": "13px",
  "--text-role-label-line-height": "18px",
  "--text-role-label-letter-spacing": "0.02em",
  "--text-role-stamp-font-size": "13px",
  "--text-role-stamp-line-height": "18px",
  "--text-role-stamp-letter-spacing": "0.05em",
  // The three below serve buttons, not type presets; everything above serves the seven type roles.
  "--button-size-md-height": "48px",
  "--button-size-md-padding": "24px",
  "--font-weight-semibold": "600",
};

export const REQUIRED_TOKENS = Object.keys(EXPECTED_TOKENS);

// Matches a custom-property DECLARATION (`--name:`), not a var() reference, so a token that the
// theme merely mentions is never mistaken for one the design system provides. Captures the
// declared value (up to the terminating `;` or `}`) so callers can check it, not just its presence.
const DECLARATION_PATTERN = /(?:^|[{;])\s*(--[\w-]+)\s*:\s*([^;}]+?)\s*(?=[;}])/g;

function parseDeclarations(css) {
  const declared = new Map();
  for (const match of css.matchAll(DECLARATION_PATTERN)) {
    declared.set(match[1], match[2].trim());
  }
  return declared;
}

export function findMissingTokens(css, required = REQUIRED_TOKENS) {
  const declared = parseDeclarations(css);
  return required.filter((token) => !declared.has(token));
}

// Reports every required token whose declared value differs from the expected literal. Tokens
// that are absent entirely are not reported here -- that is findMissingTokens' job, and
// double-reporting the same problem in two lists makes the failure output harder to read.
export function findWrongValues(css, expected = EXPECTED_TOKENS) {
  const declared = parseDeclarations(css);
  const wrong = [];
  for (const [token, expectedValue] of Object.entries(expected)) {
    if (!declared.has(token)) continue;
    const actual = declared.get(token);
    if (actual !== expectedValue) {
      wrong.push({ token, expected: expectedValue, actual });
    }
  }
  return wrong;
}
