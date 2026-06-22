/*
  Nombre completo: cm-bindings.js
  Ruta: carga-masiva/js/cm-bindings.js

  Función:
    - Conectar botones, inputs y acciones del DOM con CM.App.
    - Escuchar selección de archivo.
    - Escuchar procesamiento, limpieza, revisión, paginación y edición.
    - Controlar cierre del pop-up.
    - Delegar eventos de tabla de revisión.
    - No contiene lógica de procesamiento.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-app.js
    - componentes/*
*/

(function initCmBindings(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function bindClick(id, handler) {
    const element = CM.UI.byId(id);

    if (!element) {
      return;
    }

    element.addEventListener("click", handler);
  }

  function bindFileInput() {
    const input = CM.UI.byId(CONFIG.DOM_IDS.fileInput);

    if (!input) {
      return;
    }

    input.addEventListener("change", () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      CM.UI.setFileName(file);
    });
  }

  function bindReviewTable() {
    const tableBody = CM.UI.byId(CONFIG.DOM_IDS.reviewTableBody);

    if (!tableBody) {
      return;
    }

    tableBody.addEventListener("change", (event) => {
      const target = event.target;

      if (!target || !target.classList.contains("cm-event-select")) {
        return;
      }

      const eventId = target.dataset.cmEventId;
      CM.App.toggleEventSelection(eventId, target.checked);
    });

    tableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest(".cm-edit-event-btn");

      if (editButton) {
        const eventId = editButton.dataset.cmEventId;
        CM.App.editEvent(eventId);
        return;
      }

      const removeButton = event.target.closest(".cm-remove-event-btn");

      if (!removeButton) {
        return;
      }

      const eventId = removeButton.dataset.cmEventId;
      CM.App.removeEvent(eventId);
    });
  }

  function bindModalBackdrop() {
    const modal = CM.UI.byId(CONFIG.DOM_IDS.reviewModal);

    if (!modal) {
      return;
    }

    modal.addEventListener("click", (event) => {
      const shouldClose = event.target && event.target.dataset.cmCloseModal === "true";

      if (shouldClose) {
        CM.UI.closeReviewModal();
      }
    });
  }

  function bindKeyboard() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        CM.UI.closeReviewModal();
        CM.UI.clearEditor();
      }
    });
  }

  function bindMainActions() {
    bindClick(CONFIG.DOM_IDS.processBtn, CM.App.processLoad);
    bindClick(CONFIG.DOM_IDS.clearBtn, CM.App.clearAll);
    bindClick(CONFIG.DOM_IDS.openLastBatchBtn, CM.App.openLastBatch);
  }

  function bindReviewActions() {
    bindClick(CONFIG.DOM_IDS.closeReviewBtn, CM.UI.closeReviewModal);
    bindClick(CONFIG.DOM_IDS.cancelReviewBtn, CM.UI.closeReviewModal);

    bindClick(CONFIG.DOM_IDS.selectAllBtn, CM.App.selectAll);
    bindClick(CONFIG.DOM_IDS.unselectAllBtn, CM.App.unselectAll);

    bindClick(CONFIG.DOM_IDS.prevPageBtn, CM.App.previousPage);
    bindClick(CONFIG.DOM_IDS.nextPageBtn, CM.App.nextPage);

    bindClick(CONFIG.DOM_IDS.saveEditBtn, CM.App.saveEditedEvent);
    bindClick(CONFIG.DOM_IDS.confirmWarningBtn, CM.App.confirmWarningsManually);
    bindClick(CONFIG.DOM_IDS.cancelEditBtn, CM.App.cancelEdit);

    bindClick(CONFIG.DOM_IDS.addEventsBtn, CM.App.importSelectedEvents);
  }

  function init() {
    bindMainActions();
    bindReviewActions();
    bindFileInput();
    bindReviewTable();
    bindModalBackdrop();
    bindKeyboard();

    CM.App.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);