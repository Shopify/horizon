/**
 * @typedef {Object} VariantDrainState
 * @property {string | null} [resolvedVariantId] - The variant id resolved from the queued entry's
 *   own server-side section fetch. This binds a queued click to the selection that was active when
 *   the buyer clicked Add, even if the visible picker has since moved on.
 * @property {string | null} [intendedVariantId] - The variant picker's intended variant id, read
 *   from the checked radio/option's `data-variant-id`. Present for single-option products and
 *   authoritative because it never lags behind the user's selection.
 * @property {string | null} [hiddenInputValue] - The hidden `input[name="id"]` value. For
 *   multi-option products the in-flight section fetch resolves this server-side; it is only
 *   trustworthy once that fetch has been awaited (otherwise it lags the selection).
 * @property {boolean} [available] - Whether the current selection is purchasable. `false` means
 *   the selection is sold out / unavailable and must never be POSTed.
 */

/**
 * Resolve which variant id a queued add-to-cart should POST, at queue-drain time.
 *
 * Pure decision logic extracted so it can be unit-tested without a DOM/component harness.
 * It encodes the #2756 fix: prefer the queued entry's own server-resolved variant, then the
 * picker's intended variant (never lags), then the hidden input (authoritative only after the
 * section fetch is awaited). Return `null` when nothing resolves or the selection is unavailable
 * so the caller can abort instead of POSTing a stale, empty, or maxed variant id.
 *
 * @param {VariantDrainState} drainState
 * @returns {string | null} The variant id to add, or `null` to abort the queued add.
 */
export function resolveVariantId(drainState) {
  if (!drainState || drainState.available === false) return null;

  const resolved = normalizeVariantId(drainState.resolvedVariantId);
  if (resolved) return resolved;

  const intended = normalizeVariantId(drainState.intendedVariantId);
  if (intended) return intended;

  const hidden = normalizeVariantId(drainState.hiddenInputValue);
  if (hidden) return hidden;

  return null;
}

/**
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function normalizeVariantId(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}
