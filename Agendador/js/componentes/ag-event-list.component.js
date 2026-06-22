/*
  Nombre completo: ag-event-list.component.js
  Ruta: Agendador/js/componentes/ag-event-list.component.js

  Función:
    - Componente para renderizar lista de registros del Agendador.
    - Muestra eventos, pendientes y recordatorios.
    - Muestra acciones: completar, duplicar, sincronizar y eliminar.
    - No ejecuta acciones directamente; solo emite datos desde botones.
    - Mantiene una vista compacta y clara.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../ag-ui.js
    - ../servicios/ag-filter.service.js
    - ../servicios/ag-clock.service.js
*/

(function initAgEventListComponent(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Components = AG.Components || {};

  function escapeHtml(value) {
    if (AG.UI && typeof AG.UI.escapeHtml === "function") {
      return AG.UI.escapeHtml(value);
    }

    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getElements() {
    return {
      list: document.getElementById("agItemList"),
      subtitle: document.getElementById("agFilterSubtitle")
    };
  }

  function getTypeClass(itemType) {
    if (itemType === CONFIG.TYPES.PENDING) {
      return "ag-item--pending";
    }

    if (itemType === CONFIG.TYPES.REMINDER) {
      return "ag-item--reminder";
    }

    return "";
  }

  function getPillTypeClass(itemType) {
    if (itemType === CONFIG.TYPES.PENDING) {
      return "ag-pill--pending";
    }

    if (itemType === CONFIG.TYPES.REMINDER) {
      return "ag-pill--reminder";
    }

    return "ag-pill--event";
  }

  function getPriorityClass(priority) {
    return priority === CONFIG.PRIORITIES.URGENT ? "ag-pill--urgent" : "";
  }

  function getDateLabel(item) {
    const safeItem = item || {};
    const date = safeItem.date || "";
    const time = safeItem.time || "";

    if (!date && !time) {
      return "Sin fecha";
    }

    if (date && !time) {
      return date;
    }

    return `${date} · ${time}`;
  }

  function getDistanceLabel(item) {
    if (!AG.EventService || !AG.ClockService) {
      return "";
    }

    const itemDate = AG.EventService.getItemDate(item);

    if (!itemDate) {
      return "";
    }

    return AG.ClockService.describeDistanceFromNow(itemDate);
  }

  function getSyncLabel(item) {
    const syncStatus = item && item.syncStatus ? item.syncStatus : {};
    const values = Object.values(syncStatus);

    if (!values.length) {
      return "Sin sync";
    }

    if (values.some((value) => value === "error")) {
      return "Sync error";
    }

    if (values.some((value) => value === "pendingAdapter" || value === "pending")) {
      return "Sync pendiente";
    }

    if (values.some((value) => value === "skipped")) {
      return "Sync parcial";
    }

    return "Sync OK";
  }

  function createItemHtml(item) {
    const safeItem = item || {};
    const responsible = safeItem.responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const typeLabel = CONFIG.TYPE_LABELS[safeItem.type] || safeItem.type;
    const priorityLabel = CONFIG.PRIORITY_LABELS[safeItem.priority] || safeItem.priority;
    const isCompleted = safeItem.status === CONFIG.STATUS.COMPLETED;
    const completedClass = isCompleted ? "ag-item--completed" : "";
    const distanceLabel = getDistanceLabel(safeItem);

    return `
      <article class="ag-item ${getTypeClass(safeItem.type)} ${completedClass}">
        <div class="ag-item-header">
          <div>
            <h3 class="ag-item-title">${escapeHtml(safeItem.title || "Sin título")}</h3>

            <div class="ag-item-meta">
              <span class="ag-pill ${getPillTypeClass(safeItem.type)}">${escapeHtml(typeLabel)}</span>
              <span class="ag-pill ${getPriorityClass(safeItem.priority)}">${escapeHtml(priorityLabel)}</span>
              <span class="ag-pill">${escapeHtml(getDateLabel(safeItem))}</span>
              ${distanceLabel ? `<span class="ag-pill">${escapeHtml(distanceLabel)}</span>` : ""}
              <span class="ag-pill">${escapeHtml(responsible.name || "Yo")}</span>
              <span class="ag-pill">${escapeHtml(getSyncLabel(safeItem))}</span>
            </div>
          </div>

          <span class="ag-pill">${isCompleted ? "Completado" : "Activo"}</span>
        </div>

        ${safeItem.description ? `<p class="ag-item-description">${escapeHtml(safeItem.description)}</p>` : ""}

        <div class="ag-item-actions">
          <button class="ag-mini-btn" type="button" data-action="complete" data-id="${escapeHtml(safeItem.id)}">
            Completar
          </button>

          <button class="ag-mini-btn" type="button" data-action="duplicate" data-id="${escapeHtml(safeItem.id)}">
            Duplicar
          </button>

          <button class="ag-mini-btn" type="button" data-action="sync" data-id="${escapeHtml(safeItem.id)}">
            Sincronizar
          </button>

          <button class="ag-mini-btn ag-mini-btn--danger" type="button" data-action="delete" data-id="${escapeHtml(safeItem.id)}">
            Eliminar
          </button>
        </div>
      </article>
    `;
  }

  function renderEmpty(message) {
    const elements = getElements();

    elements.list.innerHTML = `
      <div class="ag-empty">
        ${escapeHtml(message || "No hay registros para este filtro.")}
      </div>
    `;
  }

  function render(items, activeFilter) {
    const elements = getElements();
    const safeItems = Array.isArray(items) ? items : [];
    const filter = activeFilter || CONFIG.FILTERS.UPCOMING;

    if (AG.FilterService && typeof AG.FilterService.getFilterSubtitle === "function") {
      elements.subtitle.textContent = AG.FilterService.getFilterSubtitle(filter, safeItems.length);
    } else {
      elements.subtitle.textContent = `Mostrando: ${CONFIG.FILTER_LABELS[filter] || "Próximos"}.`;
    }

    document.querySelectorAll(".ag-filter-btn").forEach((button) => {
      button.classList.toggle(
        "ag-filter-btn--active",
        button.dataset.filter === filter
      );
    });

    if (!safeItems.length) {
      renderEmpty("No hay registros para este filtro.");
      return [];
    }

    elements.list.innerHTML = safeItems.map(createItemHtml).join("");

    return safeItems;
  }

  function refresh(activeFilter) {
    const filter = activeFilter || AG.Storage.readActiveFilter();
    const items = AG.FilterService
      ? AG.FilterService.applyFilter(AG.Storage.readItems(), filter)
      : AG.EventService.filterItems(AG.Storage.readItems(), filter);

    return render(items, filter);
  }

  AG.Components.EventList = {
    getElements,
    getDateLabel,
    getDistanceLabel,
    getSyncLabel,
    createItemHtml,
    renderEmpty,
    render,
    refresh
  };
})(window);