import { focusableSelector } from "../../scripts/utils/focusable.js";

export const ModalDialogComponent = class extends HTMLElement {
  connectedCallback() {
    this.$opener = undefined;

    // HOTFIX (beta.43): all child lookups are LAZY and opener/close handling
    // is DELEGATED. Production showed connectedCallback firing on an element
    // whose children were not yet queryable (`this.querySelector("dialog")`
    // → null at 7s post-load; served HTML and final DOM both well-formed), so
    // eager child binding crashed and left the openers dead. Delegation also
    // covers openers added to the DOM after upgrade. Guard against double
    // wiring on re-connects (DOM moves re-fire connectedCallback).
    if (this.dataset.modalWired) return;
    this.dataset.modalWired = "true";

    document.addEventListener("click", (event) => {
      const $opener = event.target.closest?.(
        `[data-modal-open="${CSS.escape(this.id)}"]`,
      );
      if ($opener) {
        this.open($opener);
        return;
      }

      if (
        this.contains(event.target) &&
        event.target.closest?.("[data-modal-close]")
      ) {
        this.close();
      }
    });
  }

  /**
  The native dialog element — looked up lazily, never cached at connect.
   */
  get dialog() {
    return this.querySelector("dialog");
  }

  /**
   * Open dialog (focus trap, Esc and ::backdrop come free with showModal)
   * @param {HTMLElement} $opener - Element that opened the dialog
   */
  open($opener) {
    const $dialog = this.dialog;
    if (!$dialog) return;

    // Restore focus to the opener on close (incl. Esc, which closes natively)
    if (!$dialog.dataset.closeWired) {
      $dialog.dataset.closeWired = "true";
      $dialog.addEventListener("close", () => this.$opener?.focus());
    }

    this.$opener = $opener;
    $dialog.showModal();
    $dialog.querySelector(focusableSelector)?.focus();
  }

  /**
   * Close dialog
   */
  close() {
    this.dialog?.close();
  }
};
