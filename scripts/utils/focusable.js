/**
 * Selector for keyboard-focusable elements. Single source of truth — was
 * previously inlined (with a broken trailing clause) in add-another.
 */
export const focusableSelector = [
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");
