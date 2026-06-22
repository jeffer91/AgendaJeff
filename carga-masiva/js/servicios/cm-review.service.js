/*
  Nombre completo: cm-review.service.js
  Ruta: carga-masiva/js/servicios/cm-review.service.js

  Función:
    - Manejar la revisión manual de eventos detectados.
    - Abrir el pop-up de revisión.
    - Seleccionar o deseleccionar eventos.
    - Actualizar eventos editados manualmente.
    - Confirmar advertencias manualmente.
    - Revalidar eventos después de cada corrección.
    - No importa ni sincroniza eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-storage.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-validator.service.js
    - cm-app.js
*/

(function initCmReviewService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function openReview(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const events = Array.isArray(safePayload.events) ? safePayload.events : [];
    const page = safePayload.page || CONFIG.PAGINATION.DEFAULT_PAGE;
    const pageSize = safePayload.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;

    return CM.UI.renderReview(events, {
      batchName: batch.name || "Carga masiva",
      page,
      pageSize
    });
  }

  function setSelection(events, selected) {
    return (Array.isArray(events) ? events : []).map((event) => ({
      ...event,
      selected: Boolean(selected),
      updatedAt: CM.nowISO()
    }));
  }

  function toggleSelection(events, eventId, selected) {
    return (Array.isArray(events) ? events : []).map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        selected: Boolean(selected),
        updatedAt: CM.nowISO()
      };
    });
  }

  function updateEventFromEditor(events, edited) {
    const safeEvents = Array.isArray(events) ? events : [];

    return safeEvents.map((event) => {
      if (event.id !== edited.id) {
        return event;
      }

      const merged = {
        ...event,
        title: edited.title,
        type: edited.type || CONFIG.EVENT_TYPES.EVENT,
        startDate: edited.startDate,
        endDate: edited.endDate || edited.startDate,
        startTime: edited.startTime,
        endTime: edited.endTime,
        allDay: !edited.startTime && !edited.endTime,
        location: edited.location,
        responsible: edited.responsible,
        description: edited.description,
        manualReviewed: false,
        updatedAt: CM.nowISO()
      };

      if (CM.ReminderService && typeof CM.ReminderService.attachReminders === "function") {
        const withReminders = CM.ReminderService.attachReminders(merged, CM.Storage.getSettings());
        return CM.ValidatorService.validateEvent(withReminders);
      }

      return CM.ValidatorService.validateEvent(merged);
    });
  }

  function confirmWarnings(events, eventId) {
    return (Array.isArray(events) ? events : []).map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return CM.ValidatorService.markManualReviewed(event);
    });
  }

  function findEvent(events, eventId) {
    return (Array.isArray(events) ? events : []).find((event) => event.id === eventId) || null;
  }

  function getSelectedEvents(events) {
    return (Array.isArray(events) ? events : []).filter((event) => event.selected !== false);
  }

  CM.ReviewService = {
    openReview,
    setSelection,
    toggleSelection,
    updateEventFromEditor,
    confirmWarnings,
    findEvent,
    getSelectedEvents
  };
})(window);