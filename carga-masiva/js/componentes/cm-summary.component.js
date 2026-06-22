/*
  Nombre completo: cm-summary.component.js
  Ruta: carga-masiva/js/componentes/cm-summary.component.js

  Función:
    - Controlar tarjetas y contadores de resumen.
    - Mostrar detectados, OK, revisión, errores y seleccionados.
    - Actualizar resumen principal y resumen del pop-up.
    - Generar mensajes compactos sobre el estado de la carga.
    - No procesa ni importa eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - servicios/cm-validator.service.js
    - componentes/cm-review-modal.component.js
    - cm-app.js
*/

(function initCmSummaryComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function getSummary(events) {
    if (CM.ValidatorService && typeof CM.ValidatorService.getSummary === "function") {
      return CM.ValidatorService.getSummary(events);
    }

    return CM.UI.getStatusSummary(events);
  }

  function renderMainSummary(events) {
    const summary = getSummary(events);

    CM.UI.setText(CONFIG.DOM_IDS.detectedCount, summary.total);
    CM.UI.setText(CONFIG.DOM_IDS.okCount, summary.ok);
    CM.UI.setText(CONFIG.DOM_IDS.reviewCount, summary.review);
    CM.UI.setText(CONFIG.DOM_IDS.errorCount, summary.error);

    return summary;
  }

  function renderModalSummary(events) {
    const summary = getSummary(events);

    CM.UI.setText(CONFIG.DOM_IDS.modalOkCount, summary.ok);
    CM.UI.setText(CONFIG.DOM_IDS.modalReviewCount, summary.review);
    CM.UI.setText(CONFIG.DOM_IDS.modalErrorCount, summary.error);
    CM.UI.setText(CONFIG.DOM_IDS.selectedCount, summary.selected);

    return summary;
  }

  function renderAll(events) {
    return {
      main: renderMainSummary(events),
      modal: renderModalSummary(events)
    };
  }

  function createStatusMessage(events) {
    const summary = getSummary(events);

    if (!summary.total) {
      return "No hay eventos detectados.";
    }

    if (summary.selectedError > 0) {
      return `Hay ${summary.selectedError} evento(s) seleccionado(s) con error. Corrige antes de agregar.`;
    }

    if (summary.selectedReview > 0) {
      return `Hay ${summary.selectedReview} evento(s) seleccionado(s) en revisión. Corrige o confirma manualmente.`;
    }

    if (!summary.selected) {
      return "No hay eventos seleccionados para agregar.";
    }

    return `${summary.selected} evento(s) listo(s) para agregar.`;
  }

  function showStatusMessage(events) {
    const message = createStatusMessage(events);
    const summary = getSummary(events);

    if (summary.selectedError > 0) {
      CM.UI.toastError(message);
    } else if (summary.selectedReview > 0 || !summary.selected) {
      CM.UI.toastWarning(message);
    } else {
      CM.UI.toastSuccess(message);
    }

    return message;
  }

  CM.Components.Summary = {
    getSummary,
    renderMainSummary,
    renderModalSummary,
    renderAll,
    createStatusMessage,
    showStatusMessage
  };
})(window);