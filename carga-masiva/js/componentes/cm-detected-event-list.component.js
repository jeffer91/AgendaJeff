/*
  Nombre completo: cm-detected-event-list.component.js
  Ruta: carga-masiva/js/componentes/cm-detected-event-list.component.js

  Función:
    - Controlar la tabla de eventos detectados.
    - Renderizar eventos con paginación.
    - Mostrar estados OK, revisar y error.
    - Mantener 20 eventos por página por defecto.
    - Permitir obtener eventos visibles.
    - No edita ni importa eventos directamente.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - servicios/cm-validator.service.js
    - componentes/cm-review-modal.component.js
    - componentes/cm-event-editor.component.js
    - cm-app.js
*/

(function initCmDetectedEventListComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function getPageCount(events, pageSize) {
    const safeEvents = Array.isArray(events) ? events : [];
    const safePageSize = Number(pageSize) || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;

    return Math.max(1, Math.ceil(safeEvents.length / safePageSize));
  }

  function normalizePage(page, events, pageSize) {
    const totalPages = getPageCount(events, pageSize);
    const safePage = Number(page) || CONFIG.PAGINATION.DEFAULT_PAGE;

    return Math.min(Math.max(1, safePage), totalPages);
  }

  function getVisibleEvents(events, page, pageSize) {
    const safeEvents = Array.isArray(events) ? events : [];
    const safePageSize = Number(pageSize) || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    const safePage = normalizePage(page, safeEvents, safePageSize);
    const start = (safePage - 1) * safePageSize;

    return safeEvents.slice(start, start + safePageSize);
  }

  function render(events, options) {
    const safeOptions = options || {};
    const pageSize = Number(safeOptions.pageSize) || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    const page = normalizePage(safeOptions.page || CONFIG.PAGINATION.DEFAULT_PAGE, events, pageSize);

    return CM.UI.renderEventsTable(events, page, pageSize);
  }

  function scrollToTop() {
    const wrapper = CM.UI.qs(".cm-table-wrap");

    if (wrapper) {
      wrapper.scrollTop = 0;
    }
  }

  function findRow(eventId) {
    return CM.UI.qs(`[data-cm-event-id="${eventId}"]`);
  }

  function highlightRow(eventId) {
    const row = findRow(eventId);

    if (!row) {
      return false;
    }

    row.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    row.style.outline = "3px solid rgba(37, 99, 235, 0.25)";

    window.setTimeout(() => {
      row.style.outline = "";
    }, 1300);

    return true;
  }

  function getSelectedIdsFromDOM() {
    return CM.UI.qsa(".cm-event-select")
      .filter((input) => input.checked)
      .map((input) => input.dataset.cmEventId)
      .filter(Boolean);
  }

  CM.Components.DetectedEventList = {
    getPageCount,
    normalizePage,
    getVisibleEvents,
    render,
    scrollToTop,
    findRow,
    highlightRow,
    getSelectedIdsFromDOM
  };
})(window);