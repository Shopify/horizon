#!/usr/bin/env node

/**
 * Sync design tokens from a Figma variable cache into settings_data.json.
 *
 * Usage:
 *   node scripts/sync-figma-tokens.js                          # Linen House (default)
 *   node scripts/sync-figma-tokens.js --brand=aura-home        # Aura Home
 *   node scripts/sync-figma-tokens.js --preview                # Preview without writing
 *   node scripts/sync-figma-tokens.js --brand=aura-home --preview
 *
 * Token sources:
 *   tokens/figma-variables.json       — Linen House brand tokens
 *   tokens/aura-home-variables.json   — Aura Home brand tokens
 *
 * Note: Figma Variables REST API requires Enterprise plan. Re-extract using the
 * figma:figma-use Claude skill when design tokens change in Figma.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PREVIEW = process.argv.includes('--preview');
const BRAND_ARG = process.argv.find((a) => a.startsWith('--brand='));
const BRAND = BRAND_ARG ? BRAND_ARG.split('=')[1] : 'linen-house';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert Figma RGBA (0–1) to CSS hex string. */
function figmaColourToHex({ r, g, b, a = 1 }) {
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a.toFixed(2)})` : hex;
}

/** Lighten a hex colour by mixing with white at a given ratio (0–1). */
function lighten(hex, ratio) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.round(c + (255 - c) * ratio);
  return `#${mix(r).toString(16).padStart(2, '0')}${mix(g).toString(16).padStart(2, '0')}${mix(b).toString(16).padStart(2, '0')}`;
}

/** Darken a hex colour by mixing with black at a given ratio (0–1). */
function darken(hex, ratio) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.round(c * (1 - ratio));
  return `#${mix(r).toString(16).padStart(2, '0')}${mix(g).toString(16).padStart(2, '0')}${mix(b).toString(16).padStart(2, '0')}`;
}

// ── Token cache ──────────────────────────────────────────────────────────────

function loadTokenMap(brand) {
  const cacheFiles = {
    'linen-house': 'tokens/figma-variables.json',
    'aura-home': 'tokens/aura-home-variables.json',
  };
  const cacheFile = cacheFiles[brand];
  if (!cacheFile) throw new Error(`Unknown brand: ${brand}. Valid brands: ${Object.keys(cacheFiles).join(', ')}`);
  const cachePath = resolve(ROOT, cacheFile);
  const cache = JSON.parse(readFileSync(cachePath, 'utf8'));
  console.log(`  Loaded ${Object.keys(cache.tokens).length} tokens from ${cacheFile}`);
  return cache.tokens;
}

// ── Token → settings mapping ─────────────────────────────────────────────────

/**
 * Shared token reader. Converts Figma RGBA colours to hex, passes other values through.
 */
function makeGetter(tokenMap) {
  return (name) => {
    const token = tokenMap[name];
    if (!token) return null;
    if (token.type === 'COLOR') return figmaColourToHex(token.value);
    return token.value;
  };
}

/**
 * Map Linen House Figma tokens to Horizon theme settings values.
 *
 * Figma collections: Colour (mode: Linen House), Typography, Size
 *
 * Key brand characteristics:
 *   - Font: TT Commons Pro (heading weight 500–600, body 400)
 *   - Dark: near-black #0e0e0e — warm, not pure black
 *   - Secondary surfaces: warm off-white #f9f8f5 (cream-tinted)
 *   - Radii: very rounded — buttons 64px, badges 64px, fields 8px
 *   - Shopify font IDs: tt_commons_pro_n5 (Medium), tt_commons_pro_n6 (SemiBold),
 *     tt_commons_pro_n4 (Regular). Verify in theme editor after push.
 */
function mapLinenHouseTokens(tokenMap) {
  const get = makeGetter(tokenMap);

  // Semantic colour tokens from Figma Colour collection (Linen House mode)
  const bgDefault     = get('background/default')   ?? '#ffffff';
  const bgInverse     = get('background/inverse')   ?? '#0e0e0e';
  const bgPrimary     = get('background/primary')   ?? '#f7f7f7';
  const bgSecondary   = get('background/secondary') ?? '#f9f8f5';
  const bgTertiary    = get('background/tertiary')  ?? '#fffaf0';
  const textDefault   = get('text/default')          ?? '#0e0e0e';
  const textInverse   = get('text/inverse')          ?? '#f9f8f5';
  const textSecondary = get('text/secondary')        ?? '#333333';
  const textTertiary  = get('text/tertiary')         ?? '#999999';
  const strokeDefault = get('stroke/default')        ?? '#0e0e0e';
  const strokeSecondary = get('stroke/secondary')    ?? '#d5d5d5';

  // Button tokens
  const btnDarkBg        = get('button/dark/background/default') ?? bgInverse;
  const btnDarkBgHover   = get('button/dark/background/hover')   ?? '#333333';
  const btnDarkText      = get('button/dark/content/default')    ?? '#efede5';
  const btnLightBg       = get('button/light/background/default') ?? bgSecondary;
  const btnLightBgHover  = get('button/light/background/hover')  ?? '#e4e1d6';
  const btnLightText     = get('button/light/content/default')   ?? textDefault;

  // Field tokens
  const fieldBg        = get('field/background/default') ?? bgSecondary;
  const fieldBgHover   = get('field/background/hover')   ?? '#efede5';
  const fieldStroke    = get('field/stroke/default')      ?? bgSecondary;
  const fieldText      = get('field/content/default')     ?? textDefault;

  // Variant tokens
  const varBg          = get('variant/background/default') ?? bgInverse;
  const varBgInverse   = get('variant/background/inverse') ?? bgSecondary;
  const varBgHover     = get('variant/background/hover')   ?? '#e4e1d6';
  const varStroke      = get('variant/stroke/default')     ?? bgInverse;
  const varStrokeHover = get('variant/stroke/hover')       ?? '#e4e1d6';
  const varText        = get('variant/content/default')    ?? textDefault;
  const varTextInverse = get('variant/content/inverse')    ?? bgSecondary;

  const settings = {};

  // ── Brand identifier ─────────────────────────────────────────────────────
  settings.brand = 'linen-house';

  // ── Radius ───────────────────────────────────────────────────────────────
  settings.card_corner_radius             = get('component/radius') ?? 16;
  settings.inputs_border_radius           = get('field/radius') ?? 8;
  settings.popover_border_radius          = get('component/radius') ?? 16;
  settings.button_border_radius_primary   = get('button/radius') ?? 64;
  settings.button_border_radius_secondary = get('button/radius') ?? 64;
  settings.badge_corner_radius            = get('badge/radius') ?? 64;

  // ── Typography ───────────────────────────────────────────────────────────
  // Shopify font picker fallbacks (actual fonts loaded via custom-fonts.liquid)
  settings.type_heading_font    = 'work_sans_n5';
  settings.type_subheading_font = 'work_sans_n5';
  settings.type_body_font       = 'work_sans_n4';
  settings.type_accent_font     = 'work_sans_n5';

  settings.type_size_paragraph        = '14';
  settings.type_line_height_paragraph = 'body-loose';

  // H1 — Figma heading/large: 72px
  settings.type_font_h1        = 'heading';
  settings.type_weight_h1      = '600';
  settings.type_size_h1        = '72';
  settings.type_line_height_h1 = 'display-tight';

  // H2 — Figma heading/medium: 56px
  settings.type_font_h2        = 'heading';
  settings.type_weight_h2      = '600';
  settings.type_size_h2        = '56';
  settings.type_line_height_h2 = 'display-tight';

  // H3 — Figma heading/small: 48px
  settings.type_font_h3        = 'heading';
  settings.type_weight_h3      = '600';
  settings.type_size_h3        = '48';
  settings.type_line_height_h3 = 'display-tight';

  // H4 — Figma subheading/large: 40px
  settings.type_font_h4        = 'heading';
  settings.type_weight_h4      = '500';
  settings.type_size_h4        = '40';
  settings.type_line_height_h4 = 'display-normal';

  // H5 — Figma subheading/medium: 32px
  settings.type_font_h5        = 'heading';
  settings.type_weight_h5      = '500';
  settings.type_size_h5        = '32';
  settings.type_line_height_h5 = 'display-normal';

  // H6 — Figma subheading/small: 20px
  settings.type_font_h6        = 'subheading';
  settings.type_weight_h6      = '500';
  settings.type_size_h6        = '20';
  settings.type_line_height_h6 = 'display-normal';

  // ── Colour schemes ───────────────────────────────────────────────────────
  // LH Figma: variant/background/default IS the selected (filled dark) state
  settings.color_schemes = buildSchemes({
    bgDefault, bgInverse, bgPrimary, bgSecondary, bgTertiary,
    textDefault, textInverse, textSecondary, textTertiary,
    strokeDefault, strokeSecondary,
    btnDarkBg, btnDarkBgHover, btnDarkText,
    btnLightBg, btnLightBgHover, btnLightText,
    fieldBg, fieldBgHover, fieldStroke, fieldText,
    varBgHover, varStroke, varStrokeHover, varText,
    selVarBg: varBg, selVarText: varTextInverse, selVarBorder: varBg,
  });

  return settings;
}

/**
 * Map Aura Home Figma tokens to Horizon theme settings values.
 *
 * Key brand characteristics:
 *   - Font: Futura PT (heading weight 500, body 400)
 *   - Dark: charcoal #333333 — softer than Linen House
 *   - Secondary surfaces: cool neutral greys (no warm tint)
 *   - Radii: sharp — buttons 4px, badges 4px, fields 4px
 *   - Shopify font IDs: futura_pt_n5 (Medium), futura_pt_n4 (Regular).
 *     Verify in theme editor after push.
 */
function mapAuraHomeTokens(tokenMap) {
  const get = makeGetter(tokenMap);

  const bgDefault     = get('background/default')   ?? '#ffffff';
  const bgInverse     = get('background/inverse')   ?? '#333333';
  const bgPrimary     = get('background/primary')   ?? '#f7f7f7';
  const bgSecondary   = get('background/secondary') ?? '#e7e7e7';
  const bgTertiary    = get('background/tertiary')  ?? '#dedede';
  const textDefault   = get('text/default')          ?? '#333333';
  const textInverse   = get('text/inverse')          ?? '#ffffff';
  const textSecondary = get('text/secondary')        ?? '#666666';
  const textTertiary  = get('text/tertiary')         ?? '#999999';
  const strokeDefault = get('stroke/default')        ?? '#333333';
  const strokeSecondary = get('stroke/secondary')    ?? '#d5d5d5';

  const btnDarkBg        = get('button/dark/background/default') ?? bgInverse;
  const btnDarkBgHover   = get('button/dark/background/hover')   ?? '#666666';
  const btnDarkText      = get('button/dark/content/default')    ?? '#ffffff';
  const btnLightBg       = get('button/light/background/default') ?? '#ffffff';
  const btnLightBgHover  = get('button/light/background/hover')  ?? '#e7e7e7';
  const btnLightText     = get('button/light/content/default')   ?? textDefault;

  const fieldBg        = get('field/background/default') ?? '#ffffff';
  const fieldBgHover   = get('field/background/hover')   ?? '#ffffff';
  const fieldStroke    = get('field/stroke/default')      ?? strokeSecondary;
  const fieldText      = get('field/content/default')     ?? textDefault;

  const varBg          = get('variant/background/default') ?? '#ffffff';
  const varBgInverse   = get('variant/background/inverse') ?? bgInverse;
  const varBgHover     = get('variant/background/hover')   ?? '#e7e7e7';
  const varStroke      = get('variant/stroke/default')     ?? strokeSecondary;
  const varStrokeHover = get('variant/stroke/hover')       ?? bgInverse;
  const varText        = get('variant/content/default')    ?? textDefault;
  const varTextInverse = get('variant/content/inverse')    ?? '#ffffff';

  const settings = {};

  settings.brand = 'aura-home';

  // ── Radius ───────────────────────────────────────────────────────────────
  settings.card_corner_radius             = get('component/radius') ?? 4;
  settings.inputs_border_radius           = get('field/radius') ?? 4;
  settings.popover_border_radius          = get('component/radius') ?? 4;
  settings.button_border_radius_primary   = get('button/radius') ?? 4;
  settings.button_border_radius_secondary = get('button/radius') ?? 4;
  settings.badge_corner_radius            = get('badge/radius') ?? 4;

  // ── Typography ───────────────────────────────────────────────────────────
  // Shopify font picker fallbacks (actual fonts loaded via custom-fonts.liquid)
  settings.type_heading_font    = 'work_sans_n5';
  settings.type_subheading_font = 'work_sans_n4';
  settings.type_body_font       = 'work_sans_n4';
  settings.type_accent_font     = 'work_sans_n5';

  settings.type_size_paragraph        = '14';
  settings.type_line_height_paragraph = 'body-loose';

  // H1 — Figma heading/large: 64px
  settings.type_font_h1        = 'heading';
  settings.type_weight_h1      = '500';
  settings.type_size_h1        = '64';
  settings.type_line_height_h1 = 'display-tight';

  // H2 — Figma heading/medium: 48px
  settings.type_font_h2        = 'heading';
  settings.type_weight_h2      = '500';
  settings.type_size_h2        = '48';
  settings.type_line_height_h2 = 'display-tight';

  // H3 — Figma heading/small: 40px
  settings.type_font_h3        = 'heading';
  settings.type_weight_h3      = '500';
  settings.type_size_h3        = '40';
  settings.type_line_height_h3 = 'display-normal';

  // H4 — Figma subheading/large: 32px
  settings.type_font_h4        = 'heading';
  settings.type_weight_h4      = '400';
  settings.type_size_h4        = '32';
  settings.type_line_height_h4 = 'display-normal';

  // H5 — Figma subheading/medium: 24px
  settings.type_font_h5        = 'heading';
  settings.type_weight_h5      = '400';
  settings.type_size_h5        = '24';
  settings.type_line_height_h5 = 'display-normal';

  // H6 — Figma subheading/small: 20px
  settings.type_font_h6        = 'subheading';
  settings.type_weight_h6      = '400';
  settings.type_size_h6        = '20';
  settings.type_line_height_h6 = 'display-normal';

  // ── Colour schemes ───────────────────────────────────────────────────────
  settings.color_schemes = buildSchemes({
    bgDefault, bgInverse, bgPrimary, bgSecondary, bgTertiary,
    textDefault, textInverse, textSecondary, textTertiary,
    strokeDefault, strokeSecondary,
    btnDarkBg, btnDarkBgHover, btnDarkText,
    btnLightBg, btnLightBgHover, btnLightText,
    fieldBg, fieldBgHover, fieldStroke, fieldText,
    varBgHover, varStroke, varStrokeHover, varText,
    // AH Figma: variant/background/inverse IS the selected (filled dark) state
    selVarBg: varBgInverse, selVarText: varTextInverse, selVarBorder: varBgInverse,
  });

  return settings;
}

/**
 * Build 9 colour schemes from semantic brand tokens.
 *
 * Uses Figma semantic tokens directly rather than deriving from primitives.
 * Each scheme includes the extended Horizon properties (input_*, variant_*,
 * selected_variant_*).
 */
function buildSchemes({
  bgDefault, bgInverse, bgPrimary, bgSecondary, bgTertiary,
  textDefault, textInverse, textSecondary, textTertiary,
  strokeDefault, strokeSecondary,
  btnDarkBg, btnDarkBgHover, btnDarkText,
  btnLightBg, btnLightBgHover, btnLightText,
  fieldBg, fieldBgHover, fieldStroke, fieldText,
  varBgHover, varStroke, varStrokeHover, varText,
  selVarBg, selVarText, selVarBorder,
}) {
  const inputProps = (bg, text, border, hoverBg) => ({
    input_background: bg,
    input_text_color: text,
    input_border_color: border,
    input_hover_background: hoverBg,
  });

  const variantProps = (bg, text, border, hoverBg, hoverText, hoverBorder,
                        selBg, selText, selBorder, selHoverBg, selHoverText, selHoverBorder) => ({
    variant_background_color: bg,
    variant_text_color: text,
    variant_border_color: border,
    variant_hover_background_color: hoverBg,
    variant_hover_text_color: hoverText,
    variant_hover_border_color: hoverBorder,
    selected_variant_background_color: selBg,
    selected_variant_text_color: selText,
    selected_variant_border_color: selBorder,
    selected_variant_hover_background_color: selHoverBg,
    selected_variant_hover_text_color: selHoverText,
    selected_variant_hover_border_color: selHoverBorder,
  });

  // Standard light variant props (used by most light schemes)
  const lightVariants = variantProps(
    bgDefault, varText, varStroke,
    varBgHover, varText, varStrokeHover,
    selVarBg, selVarText, selVarBorder,
    darken(selVarBg, 0.1), selVarText, darken(selVarBorder, 0.1),
  );

  // Dark surface variant props
  const darkVariants = variantProps(
    darken(bgInverse, 0.1), textInverse, `${textInverse}21`,
    `${textInverse}1a`, textInverse, `${textInverse}4d`,
    textInverse, bgInverse, textInverse,
    darken(textInverse, 0.05), bgInverse, darken(textInverse, 0.05),
  );

  return {
    // scheme-1: Primary light surface (default) — white background
    'scheme-1': {
      settings: {
        background: bgDefault,
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: `${strokeDefault}0f`,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgPrimary,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textSecondary,
        ...inputProps(fieldBg, fieldText, fieldStroke, fieldBgHover),
        ...lightVariants,
      },
    },
    // scheme-2: Secondary surface — off-white / warm grey
    'scheme-2': {
      settings: {
        background: bgPrimary,
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: strokeSecondary,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgSecondary,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textSecondary,
        ...inputProps('rgba(0,0,0,0)', textSecondary, `${strokeDefault}21`, bgSecondary),
        ...lightVariants,
      },
    },
    // scheme-3: Brand accent surface — warm tertiary
    'scheme-3': {
      settings: {
        background: bgSecondary,
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: `${strokeDefault}1a`,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgDefault,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textDefault,
        ...inputProps(bgDefault, fieldText, strokeSecondary, bgPrimary),
        ...lightVariants,
      },
    },
    // scheme-4: Mid-tone surface — tertiary background
    'scheme-4': {
      settings: {
        background: bgTertiary,
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: `${strokeDefault}1a`,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgDefault,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textDefault,
        ...inputProps(bgDefault, fieldText, strokeSecondary, bgPrimary),
        ...lightVariants,
      },
    },
    // scheme-5: Dark surface — inverse background
    'scheme-5': {
      settings: {
        background: bgInverse,
        foreground_heading: textInverse,
        foreground: textInverse,
        primary: textInverse,
        primary_hover: textTertiary,
        border: `${textInverse}1a`,
        shadow: bgInverse,
        primary_button_background: btnLightBg,
        primary_button_text: btnLightText,
        primary_button_border: btnLightBg,
        primary_button_hover_background: btnLightBgHover,
        primary_button_hover_text: btnLightText,
        primary_button_hover_border: btnLightBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textInverse,
        secondary_button_border: `${textInverse}4d`,
        secondary_button_hover_background: `${textInverse}1a`,
        secondary_button_hover_text: textInverse,
        secondary_button_hover_border: textInverse,
        ...inputProps(darken(bgInverse, 0.1), textInverse, `${textInverse}21`, `${textInverse}0a`),
        ...darkVariants,
      },
    },
    // scheme-6: Transparent
    'scheme-6': {
      settings: {
        background: 'rgba(0,0,0,0)',
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: `${strokeDefault}1a`,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgPrimary,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textDefault,
        ...inputProps(bgDefault, fieldText, strokeSecondary, bgPrimary),
        ...lightVariants,
      },
    },
    // scheme-7: Promotional / announcement — accent tint
    'scheme-7': {
      settings: {
        background: bgTertiary,
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: `${strokeDefault}15`,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgDefault,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textDefault,
        ...inputProps(bgDefault, fieldText, strokeSecondary, bgPrimary),
        ...lightVariants,
      },
    },
    // scheme-8: Header top row
    'scheme-8': {
      settings: {
        background: bgPrimary,
        foreground_heading: textDefault,
        foreground: textDefault,
        primary: textDefault,
        primary_hover: textSecondary,
        border: `${strokeDefault}1a`,
        shadow: strokeDefault,
        primary_button_background: btnDarkBg,
        primary_button_text: btnDarkText,
        primary_button_border: btnDarkBg,
        primary_button_hover_background: btnDarkBgHover,
        primary_button_hover_text: btnDarkText,
        primary_button_hover_border: btnDarkBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textDefault,
        secondary_button_border: textDefault,
        secondary_button_hover_background: bgSecondary,
        secondary_button_hover_text: textDefault,
        secondary_button_hover_border: textDefault,
        ...inputProps('rgba(0,0,0,0)', textSecondary, `${strokeDefault}21`, bgSecondary),
        ...lightVariants,
      },
    },
    // scheme-9: Navigation bar — dark
    'scheme-9': {
      settings: {
        background: bgInverse,
        foreground_heading: textInverse,
        foreground: textInverse,
        primary: textInverse,
        primary_hover: textTertiary,
        border: `${textInverse}1a`,
        shadow: bgInverse,
        primary_button_background: btnLightBg,
        primary_button_text: btnLightText,
        primary_button_border: btnLightBg,
        primary_button_hover_background: btnLightBgHover,
        primary_button_hover_text: btnLightText,
        primary_button_hover_border: btnLightBgHover,
        secondary_button_background: 'rgba(0,0,0,0)',
        secondary_button_text: textInverse,
        secondary_button_border: `${textInverse}4d`,
        secondary_button_hover_background: `${textInverse}1a`,
        secondary_button_hover_text: textInverse,
        secondary_button_hover_border: textInverse,
        ...inputProps(darken(bgInverse, 0.1), textInverse, `${textInverse}21`, `${textInverse}0a`),
        ...darkVariants,
      },
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Loading Figma token cache (brand: ${BRAND})...`);
  const tokenMap = loadTokenMap(BRAND);

  const mappers = {
    'linen-house': mapLinenHouseTokens,
    'aura-home': mapAuraHomeTokens,
  };
  const mapper = mappers[BRAND];
  if (!mapper) throw new Error(`No mapper for brand: ${BRAND}`);
  const settings = mapper(tokenMap);

  if (PREVIEW) {
    console.log('\nPreview — settings that would be applied:\n');
    console.log(JSON.stringify(settings, null, 2));
    return;
  }

  // Read and update settings_data.json
  const settingsPath = resolve(ROOT, 'config/settings_data.json');
  const raw = readFileSync(settingsPath, 'utf8');
  // Strip the Shopify auto-generated comment header
  const jsonStr = raw.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  const data = JSON.parse(jsonStr);

  // Apply top-level settings (radius, typography, etc.) — skip color_schemes key
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'color_schemes') continue;
    data.current[key] = value;
  }

  // Merge colour schemes into both current and presets sections
  if (settings.color_schemes) {
    data.current.color_schemes ??= {};
    data.presets ??= {};
    data.presets['Default'] ??= {};
    data.presets['Default'].color_schemes ??= {};

    for (const [schemeKey, schemeValue] of Object.entries(settings.color_schemes)) {
      if (!data.current.color_schemes[schemeKey]) {
        data.current.color_schemes[schemeKey] = { settings: {} };
      }
      Object.assign(data.current.color_schemes[schemeKey].settings, schemeValue.settings);

      if (!data.presets['Default'].color_schemes[schemeKey]) {
        data.presets['Default'].color_schemes[schemeKey] = { settings: {} };
      }
      Object.assign(data.presets['Default'].color_schemes[schemeKey].settings, schemeValue.settings);
    }
  }

  // Write back (preserve comment header)
  const header = raw.match(/^(\/\*[\s\S]*?\*\/\s*)/)?.[1] ?? '';
  writeFileSync(settingsPath, header + JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`\nApplied ${BRAND} tokens to config/settings_data.json`);

  // Summary
  if (settings.color_schemes) {
    console.log('\nColour schemes updated:');
    for (const [key, scheme] of Object.entries(settings.color_schemes)) {
      console.log(`  ${key}: bg=${scheme.settings.background} btn=${scheme.settings.primary_button_background}`);
    }
  }
}

main();
