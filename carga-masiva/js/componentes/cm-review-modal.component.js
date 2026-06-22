/*
  Nombre completo: cm-review-modal.component.js
  Ruta: carga-masiva/js/componentes/cm-review-modal.component.js

  Función:
    - Controlar el pop-up de revisión obligatoria.
    - Abrir y cerrar modal.
    - Renderizar resumen del lote.
    - Actualizar estado del botón Agregar eventos.
    - Mantener visible la regla: solo se puede agregar cuando todo está OK.
    - No procesa ni importa eventos directamente.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - servicios/cm-validator.service.js
    - servicios/cm-review.service.js
    - componentes/cm-detected-event-list.component.js
    - componentes/cm-summary.component.js
    - cm-app.js
*/

(function initCmReviewModalComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function getModal() {
    return CM.UI.byId(CONFIG.DOM_IDS.reviewModal);
  }

  function isOpen() {
    const modal = getModal();

    return Boolean(modal && !modal.classList.contains("cm-hidden"));
  }

  function open() {
    CM.UI.openReviewModal();
  }

  function close() {
    CM.UI.closeReviewModal();
    CM.UI.clearEditor();
  }

  function setTitle(batchName) {
    CM.UI.setText(CONFIG.DOM_IDS.reviewModalTitle, batchName || "Eventos detectados");
  }

  function setSummaryText(text) {
    CM.UI.setText(CONFIG.DOM_IDS.reviewSummary, text || "");
  }

  function getBlockingMessage(events) {
    const validation = CM.ValidatorService.canImport(events);

    if (validation.ok) {
      return CONFIG.MESSAGES.READY_TO_IMPORT;
    }

    return validation.message;
  }

  function updateAddButton(events) {
    const validation = CM.ValidatorService.canImport(events);
    const button = CM.UI.byId(CONFIG.DOM_IDS.addEventsBtn);

    if (button) {
      button.disabled = !validation.ok;
      button.title = validation.message;
    }

    return validation;
  }

  function render(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const events = Array.isArray(safePayload.events) ? safePayload.events : [];
    const page = safePayload.page || CONFIG.PAGINATION.DEFAULT_PAGE;
    const pageSize = safePayload.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;

    const summary = CM.ValidatorService.getSummary(events);
    const validation = updateAddButton(events);

    setTitle(batch.name || "Carga masiva");

    setSummaryText(
      `Detectados: ${summary.total}. Seleccionados: ${summary.selected}. ${validation.message}`
    );

    if (
      CM.Components.Summary &&
      typeof CM.Components.Summary.renderModalSummary === "function"
    ) {
      CM.Components.Summary.renderModalSummary(events);
    } else {
      CM.UI.updateSummary(events);
    }

    if (
      CM.Components.DetectedEventList &&
      typeof CM.Components.DetectedEventList.render === "function"
    ) {
      CM.Components.DetectedEventList.render(events, {
        page,
        pageSize
      });
    } else {
      CM.UI.renderEventsTable(events, page, pageSize);
    }

    open();

    return {
      summary,
      validation
    };
  }

  function showBlockedReason(events) {
    const validation = CM.ValidatorService.canImport(events);

    if (validation.ok) {
      CM.UI.toastSuccess(validation.message);
    } else {
      CM.UI.toastWarning(validation.message);
    }

    return validation;
  }

  CM.Components.ReviewModal = {
    getModal,
    isOpen,
    open,
    close,
    setTitle,
    setSummaryText,
    getBlockingMessage,
    updateAddButton,
    render,
    showBlockedReason
  };
})(window);