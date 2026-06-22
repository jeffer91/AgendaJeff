/*
  Nombre completo: ag-filter.service.js
  Ruta: Agendador/js/servicios/ag-filter.service.js

  Función:
    - Centralizar filtros del Agendador.
    - Filtrar próximos, hoy, pendientes, pasados y todos.
    - Crear etiquetas y subtítulos para filtros.
    - Preparar contadores por filtro.
    - No pinta interfaz.
    - No guarda directamente en localStorage.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ag-event.service.js
    - ../ag-ui.js
*/

(function initAgFilterService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeFilter(filterName) {
    const filter = normalizeText(filterName);

    if (
      filter === CONFIG.FILTERS.UPCOMING ||
      filter === CONFIG.FILTERS.TODAY ||
      filter === CONFIG.FILTERS.PENDING ||
      filter === CONFIG.FILTERS.PAST ||
      filter === CONFIG.FILTERS.ALL
    ) {
      return filter;
    }

    return CONFIG.FILTERS.UPCOMING;
  }

  function getFilterLabel(filterName) {
    const filter = normalizeFilter(filterName);
    return CONFIG.FILTER_LABELS[filter] || "Próximos";
  }

  function getFilterSubtitle(filterName, count) {
    const filter = normalizeFilter(filterName);
    const safeCount = Number(count || 0);

    const labels = {
      upcoming: `Mostrando ${safeCount} registro(s) próximos.`,
      today: `Mostrando ${safeCount} registro(s) de hoy.`,
      pending: `Mostrando ${safeCount} pendiente(s) activos.`,
      past: `Mostrando ${safeCount} registro(s) pasados o completados.`,
      all: `Mostrando ${safeCount} registro(s) en total.`
    };

    return labels[filter] || labels.upcoming;
  }

  function applyFilter(items, filterName) {
    const filter = normalizeFilter(filterName);
    return AG.EventService.filterItems(items, filter);
  }

  function countByFilters(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return {
      upcoming: applyFilter(safeItems, CONFIG.FILTERS.UPCOMING).length,
      today: applyFilter(safeItems, CONFIG.FILTERS.TODAY).length,
      pending: applyFilter(safeItems, CONFIG.FILTERS.PENDING).length,
      past: applyFilter(safeItems, CONFIG.FILTERS.PAST).length,
      all: applyFilter(safeItems, CONFIG.FILTERS.ALL).length
    };
  }

  function createFilterState(items, activeFilter) {
    const filter = normalizeFilter(activeFilter);
    const filteredItems = applyFilter(items, filter);
    const counters = countByFilters(items);

    return {
      activeFilter: filter,
      label: getFilterLabel(filter),
      subtitle: getFilterSubtitle(filter, filteredItems.length),
      counters,
      items: filteredItems
    };
  }

  function saveActiveFilter(filterName) {
    const filter = normalizeFilter(filterName);
    AG.Storage.saveActiveFilter(filter);
    return filter;
  }

  function readActiveFilter() {
    return normalizeFilter(AG.Storage.readActiveFilter());
  }

  AG.FilterService = {
    normalizeFilter,
    getFilterLabel,
    getFilterSubtitle,
    applyFilter,
    countByFilters,
    createFilterState,
    saveActiveFilter,
    readActiveFilter
  };
})(window);