import { focusableSelector } from "../../scripts/utils/focusable.js";

export const ModalDialogComponent = class extends HTMLElement {
  connectedCallback() {
    this.$dialog = this.querySelector("dialog");
    this.$opener = null;

    for (const $button of document.querySelectorAll(
      `[data-modal-open="${this.id}"]`,
    )) {
      $button.addEventListener("click", () => this.open($button));
    }

    for (const $close of this.querySelectorAll("[data-modal-close]")) {
      $close.addEventListener("click", () => this.close());
    }

    // Restore focus to the opener on close (incl. Esc, which closes natively)
    this.$dialog.addEventListener("close", () => this.$opener?.focus());
  }

  /**
   * Open dialog (focus trap, Esc and ::backdrop come free with showModal)
   * @param {HTMLElement} $opener - Element that opened the dialog
   */
  open($opener) {
    this.$opener = $opener;
    this.$dialog.showModal();
    this.$dialog.querySelector(focusableSelector)?.focus();
  }

  /**
   * Close dialog
   */
  close() {
    this.$dialog.close();
  }
};
