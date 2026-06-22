/*
  Nombre completo: ag-summary-cards.component.js
  Ruta: Agendador/js/componentes/ag-summary-cards.component.js

  Función:
    - Componente para actualizar las tarjetas superiores del Agendador.
    - Muestra próximo evento, contador de hoy, mañana y pendientes.
    - Puede trabajar con AG.DashboardService o con AG.EventService.
    - No guarda datos.
    - No sincroniza conexiones.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../ag-ui.js
    - ../servicios/ag-dashboard.service.js
    - ../servicios/ag-clock.service.js
*/

(function initAgSummaryCardsComponent(global) {
  "use strict";

  const AG = global.AG = global.AG || {};

  AG.Components = AG.Components || {};

  function getElements() {
    return {
      nextEventTitle: document.getElementById("agNextEventTitle"),
      nextEventTime: document.getElementById("agNextEventTime"),
      todayCount: document.getElementById("agTodayCount"),
      tomorrowCount: document.getElementById("agTomorrowCount"),
      pendingCount: document.getElementById("agPendingCount")
    };
  }

  function createSummary(items) {
    if (AG.DashboardService && typeof AG.DashboardService.createSummary === "function") {
      return AG.DashboardService.createSummary(items);
    }

    return AG.EventService.createDashboardSummary(items);
  }

  function renderFromSummary(summary) {
    const elements = getElements();
    const safeSummary = summary || {};
    const nextAlert = safeSummary.nextAlert || null;
    const nextItem = safeSummary.nextItem || null;

    if (nextAlert && nextAlert.hasAlert) {
      elements.nextEventTitle.textContent = nextAlert.title;
      elements.nextEventTime.textContent = nextAlert.detail;
    } else if (nextItem) {
      elements.nextEventTitle.textContent = nextItem.title;
      elements.nextEventTime.textContent = `${nextItem.date || ""} ${nextItem.time || ""}`.trim();
    } else {
      elements.nextEventTitle.textContent = "Sin eventos próximos";
      elements.nextEventTime.textContent = "Crea un evento para verlo aquí.";
    }

    elements.todayCount.textContent = String(safeSummary.todayCount || 0);
    elements.tomorrowCount.textContent = String(safeSummary.tomorrowCount || 0);
    elements.pendingCount.textContent = String(safeSummary.pendingCount || 0);

    return safeSummary;
  }

  function render(items) {
    const summary = createSummary(items || AG.Storage.readItems());
    return renderFromSummary(summary);
  }

  function refresh() {
    return render(AG.Storage.readItems());
  }

  AG.Components.SummaryCards = {
    getElements,
    createSummary,
    renderFromSummary,
    render,
    refresh
  };
})(window);