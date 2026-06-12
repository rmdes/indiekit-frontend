export const ToggleSwitchComponent = class extends HTMLElement {
  connectedCallback() {
    // HOTFIX (beta.43): listen on the component itself (change bubbles) so a
    // childless/early connect — observed in production for modal-dialog —
    // cannot silently skip wiring. Idempotent across re-connects.
    if (this.dataset.toggleWired) return;
    this.dataset.toggleWired = "true";

    this.addEventListener("change", (event) => {
      if (event.target.matches?.("[data-toggle-submit]")) {
        event.target.closest("form")?.requestSubmit();
      }
    });
  }
};
