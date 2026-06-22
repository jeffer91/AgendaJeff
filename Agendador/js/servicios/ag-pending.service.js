/*
  Nombre completo: ag-pending.service.js
  Ruta: Agendador/js/servicios/ag-pending.service.js

  Función:
    - Manejar lógica específica de pendientes.
    - Crear pendientes desde datos simples.
    - Detectar pendientes vencidos, próximos y completados.
    - Generar resumen de pendientes.
    - No pinta interfaz.
    - No guarda directamente en localStorage.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ag-event.service.js
    - ../ag-app.js
*/

(function initAgPendingService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function createPending(input, responsible) {
    const safeInput = input || {};

    return AG.EventService.createItem(
      {
        ...safeInput,
        type: CONFIG.TYPES.PENDING,
        time: normalizeText(safeInput.time),
        durationMinutes: safeInput.durationMinutes || CONFIG.DEFAULT_DURATION_MINUTES,
        channels: Array.isArray(safeInput.channels)
          ? safeInput.channels
          : ["local", "telegram", "desktopNotifications", "firebase"],
        reminders: Array.isArray(safeInput.reminders)
          ? safeInput.reminders
          : ["3d", "1d", "0d"]
      },
      responsible || CONFIG.DEFAULT_RESPONSIBLE
    );
  }

  function isPending(item) {
    return item && item.type === CONFIG.TYPES.PENDING;
  }

  function isCompleted(item) {
    return item && item.status === CONFIG.STATUS.COMPLETED;
  }

  function getPendingDate(item) {
    if (!item || !item.date) {
      return null;
    }

    const time = normalizeText(item.time) || "23:59";
    const parsedDate = new Date(`${item.date}T${time}:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function isPendingOverdue(item) {
    if (!isPending(item) || isCompleted(item)) {
      return false;
    }

    const dueDate = getPendingDate(item);

    if (!dueDate) {
      return false;
    }

    return dueDate.getTime() < Date.now();
  }

  function isPendingUpcoming(item) {
    if (!isPending(item) || isCompleted(item)) {
      return false;
    }

    const dueDate = getPendingDate(item);

    if (!dueDate) {
      return false;
    }

    return dueDate.getTime() >= Date.now();
  }

  function getActivePendings(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.filter((item) => {
      return isPending(item) && !isCompleted(item);
    });
  }

  function getCompletedPendings(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.filter((item) => {
      return isPending(item) && isCompleted(item);
    });
  }

  function getOverduePendings(items) {
    return getActivePendings(items).filter(isPendingOverdue);
  }

  function getUpcomingPendings(items) {
    return getActivePendings(items).filter(isPendingUpcoming);
  }

  function summarizePendings(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const active = getActivePendings(safeItems);
    const completed = getCompletedPendings(safeItems);
    const overdue = getOverduePendings(safeItems);
    const upcoming = getUpcomingPendings(safeItems);

    return {
      total: safeItems.filter(isPending).length,
      active: active.length,
      completed: completed.length,
      overdue: overdue.length,
      upcoming: upcoming.length
    };
  }

  function sortPendingsByUrgency(items) {
    const safeItems = Array.isArray(items) ? items : [];

    const priorityWeight = {
      urgent: 1,
      high: 2,
      normal: 3,
      low: 4
    };

    return safeItems.slice().sort((first, second) => {
      const firstDate = getPendingDate(first);
      const secondDate = getPendingDate(second);

      const firstTime = firstDate ? firstDate.getTime() : Number.MAX_SAFE_INTEGER;
      const secondTime = secondDate ? secondDate.getTime() : Number.MAX_SAFE_INTEGER;

      if (firstTime !== secondTime) {
        return firstTime - secondTime;
      }

      return (priorityWeight[first.priority] || 3) - (priorityWeight[second.priority] || 3);
    });
  }

  AG.PendingService = {
    createPending,
    isPending,
    isCompleted,
    getPendingDate,
    isPendingOverdue,
    isPendingUpcoming,
    getActivePendings,
    getCompletedPendings,
    getOverduePendings,
    getUpcomingPendings,
    summarizePendings,
    sortPendingsByUrgency
  };
})(window);