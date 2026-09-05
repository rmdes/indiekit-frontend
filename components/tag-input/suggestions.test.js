import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSuggestionsUrl, filterSuggestions } from "./suggestions.js";

// Category Governance, Layer 1 — post-form category typeahead (pure helpers).
// The widget JS (index.js) wires the DOM/ARIA; these are the testable bits.

test("buildSuggestionsUrl: appends lowercased filter + limit; base already has ?q=", () => {
  assert.equal(
    buildSuggestionsUrl("/micropub?q=category", "Ind", 8),
    "/micropub?q=category&filter=ind&limit=8",
  );
});

test("buildSuggestionsUrl: trims the term (server filter is substring)", () => {
  assert.equal(
    buildSuggestionsUrl("/micropub?q=category", "  RSS  "),
    "/micropub?q=category&filter=rss&limit=8",
  );
});

test("buildSuggestionsUrl: encodes special characters in the term", () => {
  assert.equal(
    buildSuggestionsUrl("/micropub?q=category", "c#"),
    "/micropub?q=category&filter=c%23&limit=8",
  );
});

test("filterSuggestions: drops already-selected tags (case-insensitive)", () => {
  assert.deepEqual(
    filterSuggestions(
      ["RSS", "IndieWeb", "ActivityPub"],
      ["rss", "activitypub"],
    ),
    ["IndieWeb"],
  );
});

test("filterSuggestions: de-dupes case-insensitively, preserves first casing + order", () => {
  assert.deepEqual(filterSuggestions(["RSS", "rss", "IndieWeb"], []), [
    "RSS",
    "IndieWeb",
  ]);
});

test("filterSuggestions: caps at max", () => {
  assert.deepEqual(filterSuggestions(["a", "b", "c", "d"], [], 2), ["a", "b"]);
});

test("filterSuggestions: ignores non-strings + empties defensively", () => {
  assert.deepEqual(filterSuggestions(["RSS", "", undefined, 5, "  "], []), [
    "RSS",
  ]);
});

test("filterSuggestions: tolerates missing arrays", () => {
  assert.deepEqual(filterSuggestions(), []);
});
