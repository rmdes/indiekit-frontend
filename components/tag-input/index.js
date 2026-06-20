import TagInput from "@accessible-components/tag-input";

import { buildSuggestionsUrl, filterSuggestions } from "./suggestions.js";

const SUGGESTIONS_DEBOUNCE_MS = 160;
let suggestionInstanceCount = 0;

export const TagInputFieldComponent = class extends HTMLElement {
  connectedCallback() {
    this.$errorMessage = this.querySelector(".error-message");
    this.$hint = this.querySelector(".hint");
    this.$replacedLabel = this.querySelector(".label");
    this.$replacedInput = this.querySelector(".input");
    this.value = this.$replacedInput.getAttribute("value");

    // Typeahead source (Category Governance, Layer 1). Read BEFORE the original
    // input is removed below. Absent → the field stays a plain tag input, so the
    // feature is opt-in per field via the `data-suggestions` attribute.
    const suggestionsUrl = this.$replacedInput.getAttribute("data-suggestions");

    const tags = this.value ? this.value.split(",") : [];

    const tagInput = new TagInput(this, {
      ariaTag: this.getAttribute("i18n-tag"),
      ariaEditTag: this.getAttribute("i18n-edit"),
      ariaDeleteTag: this.getAttribute("i18n-delete"),
      ariaTagAdded: this.getAttribute("i18n-added"),
      ariaTagDeleted: this.getAttribute("i18n-deleted"),
      ariaTagUpdated: this.getAttribute("i18n-updated"),
      ariaTagSelected: this.getAttribute("i18n-selected"),
      ariaNoTagsSelected: this.getAttribute("i18n-none-selected"),
      ariaInputLabel: this.getAttribute("i18n-instruction"),
      disabled: this.$replacedInput.getAttribute("disabled"),
      label: this.$replacedLabel.innerHTML,
      name: this.$replacedInput.getAttribute("name"),
      placeholder: this.getAttribute("placeholder"),
      tags,
    });

    if (this.$hint) {
      this.insertBefore(this.$hint, this.querySelector(".tag-input"));
    }

    if (this.$errorMessage) {
      this.insertBefore(this.$errorMessage, this.querySelector(".tag-input"));
    }

    this.querySelector(".tag-input-label").classList.add("label");

    this.$replacedLabel.remove();
    this.$replacedInput.remove();

    /**
     * @type {HTMLInputElement}
     */
    const $tagInputInput = this.querySelector(".tag-input__input");

    // Add a tag when the Comma key is pressed. This matches the parsing done
    // when JavaScript is not enabled, meaning hint text correct in both cases.
    $tagInputInput.addEventListener("keydown", (event) => {
      if (event.code === "Comma") {
        event.preventDefault();
        tagInput.addTag($tagInputInput.value, false);
        $tagInputInput.value = "";
      }
    });

    // Capture any value in input not converted to tag (for example, by clicking
    // outside component before pressing tab key) and add to list of tags.
    $tagInputInput.addEventListener("blur", () => {
      if ($tagInputInput.value) {
        tagInput.addTag($tagInputInput.value, false);
        $tagInputInput.value = "";
      }
    });

    if (suggestionsUrl) {
      setupCategorySuggestions(this, $tagInputInput, tagInput, suggestionsUrl);
    }

    return tagInput;
  }
};

/**
 * Wire an accessible combobox typeahead onto a tag input (Category Governance,
 * Layer 1). Suggestions come from the Micropub `?q=category` query; selecting one
 * adds it with its canonical casing. Degrades to a normal tag input on any error
 * — a typeahead must never break the post form.
 * @param {HTMLElement} $component - the <tag-input-field> host
 * @param {HTMLInputElement} $input - the library's text input (.tag-input__input)
 * @param {object} tagInput - the @accessible-components/tag-input instance
 * @param {string} suggestionsUrl - base query URL, e.g. "/micropub?q=category"
 */
function setupCategorySuggestions($component, $input, tagInput, suggestionsUrl) {
  const uid = `tag-suggest-${++suggestionInstanceCount}`;
  const listboxId = `${uid}-listbox`;

  const $listbox = document.createElement("ul");
  $listbox.id = listboxId;
  $listbox.className = "tag-input__listbox";
  $listbox.setAttribute("role", "listbox");
  $listbox.hidden = true;
  ($component.querySelector(".tag-input") || $component).append($listbox);

  // Promote the input to a combobox (WAI-ARIA combobox + listbox popup).
  $input.setAttribute("role", "combobox");
  $input.setAttribute("aria-autocomplete", "list");
  $input.setAttribute("aria-expanded", "false");
  $input.setAttribute("aria-controls", listboxId);
  $input.setAttribute("autocomplete", "off");

  let options = [];
  let activeIndex = -1;
  let requestToken = 0;
  let debounceTimer;

  const currentTags = () =>
    (tagInput.getTags?.() || []).map((tag) =>
      typeof tag === "string" ? tag : (tag && (tag.value ?? tag.label ?? tag.name)) || "",
    );

  const optionId = (index) => `${uid}-opt-${index}`;

  const close = () => {
    if ($listbox.hidden) return;
    $listbox.hidden = true;
    $listbox.replaceChildren();
    options = [];
    activeIndex = -1;
    $input.setAttribute("aria-expanded", "false");
    $input.removeAttribute("aria-activedescendant");
  };

  const select = (value) => {
    tagInput.addTag(value, false);
    $input.value = "";
    close();
    $input.focus();
  };

  const setActive = (index) => {
    const items = [...$listbox.children];
    if (items.length === 0) return;
    activeIndex = (index + items.length) % items.length;
    items.forEach((item, i) => {
      const isActive = i === activeIndex;
      item.classList.toggle("tag-input__option--active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    $input.setAttribute("aria-activedescendant", optionId(activeIndex));
    items[activeIndex].scrollIntoView({ block: "nearest" });
  };

  const open = (names) => {
    options = names;
    activeIndex = -1;
    $listbox.replaceChildren(
      ...names.map((name, index) => {
        const $option = document.createElement("li");
        $option.id = optionId(index);
        $option.className = "tag-input__option";
        $option.setAttribute("role", "option");
        $option.setAttribute("aria-selected", "false");
        $option.textContent = name;
        // mousedown (not click): preventDefault keeps focus on the input so its
        // blur handler doesn't add the typed text before the suggestion lands.
        $option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          select(name);
        });
        return $option;
      }),
    );
    $listbox.hidden = false;
    $input.setAttribute("aria-expanded", "true");
  };

  const fetchSuggestions = async (term) => {
    const token = ++requestToken;
    try {
      const response = await fetch(buildSuggestionsUrl(suggestionsUrl, term), {
        headers: { accept: "application/json" },
      });
      if (!response.ok) return close();
      const data = await response.json();
      if (token !== requestToken) return; // a newer keystroke superseded this one
      const names = filterSuggestions(data?.categories, currentTags());
      if (names.length === 0) return close();
      open(names);
    } catch {
      close(); // network/parse failure must never break the form
    }
  };

  $input.addEventListener("input", () => {
    const term = $input.value.trim();
    clearTimeout(debounceTimer);
    if (!term) return close();
    debounceTimer = setTimeout(() => fetchSuggestions(term), SUGGESTIONS_DEBOUNCE_MS);
  });

  // Capture phase so this runs BEFORE the library's own Enter-to-add handler —
  // otherwise Enter on a highlighted suggestion would add the typed text instead
  // of the canonical casing.
  $input.addEventListener(
    "keydown",
    (event) => {
      if ($listbox.hidden) return;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActive(activeIndex + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActive(activeIndex - 1);
          break;
        case "Enter":
          if (activeIndex >= 0) {
            event.preventDefault();
            event.stopPropagation();
            select(options[activeIndex]);
          }
          break;
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          close();
          break;
        default:
          break;
      }
    },
    true,
  );

  // Close after focus leaves — deferred so a mousedown-select can win first.
  $input.addEventListener("blur", () => setTimeout(close, 120));
}
