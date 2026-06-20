/**
 * Category typeahead helpers (Category Governance, Layer 1 — post-form
 * autocomplete). Pure functions, unit-tested; the DOM/ARIA combobox lives in
 * index.js. The suggestions source is the Micropub `?q=category` query, whose
 * canonical list is published by the site-config plugin (publication.categories).
 * @module components/tag-input/suggestions
 */

const DEFAULT_LIMIT = 8;

/**
 * Build the typeahead request URL. The `?q=category` filter is a case-sensitive
 * substring match server-side, so the term is trimmed and lowercased here.
 * @param {string} base - e.g. "/micropub?q=category"
 * @param {string} term - current input value
 * @param {number} [limit]
 * @returns {string}
 */
export function buildSuggestionsUrl(base, term, limit = DEFAULT_LIMIT) {
  const separator = base.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    filter: String(term).trim().toLowerCase(),
    limit: String(limit),
  });
  return `${base}${separator}${params.toString()}`;
}

/**
 * Filter server suggestions for display: drop already-selected tags and
 * case-insensitive duplicates, preserve server order + first casing, cap at max.
 * @param {string[]} suggestions - names from the server
 * @param {string[]} selected - already-added tags
 * @param {number} [max]
 * @returns {string[]}
 */
export function filterSuggestions(suggestions, selected, max = DEFAULT_LIMIT) {
  const taken = new Set(
    (selected || []).map((s) => String(s).trim().toLowerCase()),
  );
  const seen = new Set();
  const out = [];
  for (const suggestion of suggestions || []) {
    if (typeof suggestion !== "string") continue;
    const key = suggestion.trim().toLowerCase();
    if (!key || taken.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(suggestion);
    if (out.length >= max) break;
  }
  return out;
}
