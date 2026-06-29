/*
  Nombre completo: in-summary.js
  Ruta: modulos/inicio/render/in-summary.js

  Función:
    - Calcular resumen local para la pantalla Inicio.
    - Separar filtros: hoy, próximos 7 días, próximos globales, pendientes, vencidos, sincronización y errores.
*/

(function initInicioSummary(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};

  function isOpen(item) {
    return item && item.estado !== "completado" && item.estado !== "cancelado";
  }

  function sortByDate(items) {
    return (Array.isArray(items) ? items.slice() : []).sort(function sortItems(a, b) {
      const dateCompare = String(a.fechaInicio || "").localeCompare(String(b.fechaInicio || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""));
    });
  }

  function buildSummary(allItems) {
    const items = Array.isArray(allItems) ? allItems : [];
    const today = inicio.dom.todayIsoDate();
    const sevenDays = inicio.dom.addDaysIso(7);
    const openItems = items.filter(isOpen);
    const todayItems = sortByDate(openItems.filter(function filterToday(item) { return item.fechaInicio === today; }));
    const upcomingItems = sortByDate(openItems.filter(function filterUpcoming(item) {
      return item.fechaInicio && item.fechaInicio > today && item.fechaInicio <= sevenDays;
    }));
    const allUpcomingItems = sortByDate(openItems.filter(function filterAllUpcoming(item) {
      return item.fechaInicio && item.fechaInicio > today;
    }));
    const pendingItems = sortByDate(openItems.filter(function filterPending(item) { return item.tipo === "pendiente"; }));
    const overdueItems = sortByDate(openItems.filter(function filterOverdue(item) { return item.fechaInicio && item.fechaInicio < today; }));
    const syncPendingItems = sortByDate(items.filter(function filterSync(item) {
      return item.estadoSync === "pendiente_sincronizar" || item.estado === "pendiente_sincronizar";
    }));
    const errorItems = sortByDate(items.filter(function filterError(item) {
      return item.estado === "error" || item.estadoSync === "error";
    }));

    return {
      today,
      sevenDays,
      total: items.length,
      openTotal: openItems.length,
      todayItems,
      upcomingItems,
      allUpcomingItems,
      pendingItems,
      overdueItems,
      syncPendingItems,
      errorItems
    };
  }

  inicio.summary = Object.freeze({ buildSummary, sortByDate, isOpen });
})(window);