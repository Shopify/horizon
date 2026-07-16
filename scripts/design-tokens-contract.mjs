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
  "--text-role-display-lg-font-size": "48px",
  "--text-role-display-lg-line-height": "58px",
  "--text-role-display-lg-letter-spacing": "0.02em",
  "--text-role-display-md-font-size": "36px",
  "--text-role-display-md-line-height": "44px",
  "--text-role-display-md-letter-spacing": "0.02em",
  "--text-role-heading-lg-font-size": "28px",
  "--text-role-heading-lg-line-height": "36px",
  "--text-role-heading-lg-letter-spacing": "0.02em",
  "--text-role-heading-md-font-size": "22px",
  "--text-role-heading-md-line-height": "28px",
  "--text-role-heading-md-letter-spacing": "0.02em",
  "--text-role-heading-sm-font-size": "18px",
  "--text-role-heading-sm-line-height": "24px",
  "--text-role-heading-sm-letter-spacing": "0.02em",
  "--text-role-body-md-font-size": "16px",
  "--text-role-body-md-line-height": "24px",
  "--text-role-body-md-letter-spacing": "0",
  // The three below serve buttons, not type presets; everything above serves the six type roles.
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
