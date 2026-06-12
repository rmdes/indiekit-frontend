export const ToggleSwitchComponent = class extends HTMLElement {
  connectedCallback() {
    const $input = this.querySelector("[data-toggle-submit]");
    if ($input) {
      $input.addEventListener("change", () =>
        $input.closest("form")?.requestSubmit(),
      );
    }
  }
};
