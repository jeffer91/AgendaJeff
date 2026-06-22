/*
  Nombre completo: ag-dashboard.service.js
  Ruta: Agendador/js/servicios/ag-dashboard.service.js

  Función:
    - Crear el resumen visual del Agendador.
    - Calcular próximo evento, contadores y alertas.
    - Preparar datos compactos para tarjetas superiores.
    - Preparar mensaje de alerta del próximo evento.
    - No pinta interfaz.
    - No guarda directamente en localStorage.

  Se conecta con:
    - ../ag-config.js
    - ag-event.service.js
    - ag-pending.service.js
    - ag-reminder.service.js
    - ag-clock.service.js
    - ../ag-ui.js
*/

(function initAgDashboardService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function normalizeItems(items) {
    return AG.EventService.normalizeItemsForRuntime(items || []);
  }

  function getNextMainItem(items) {
    const safeItems = normalizeItems(items);

    return safeItems.find((item) => {
      return item.status !== CONFIG.STATUS.COMPLETED &&
        item.type !== CONFIG.TYPES.PENDING &&
        AG.EventService.isUpcoming(item);
    }) || null;
  }

  function getNextAlert(items) {
    const nextItem = getNextMainItem(items);

    if (!nextItem) {
      return {
        hasAlert: false,
        title: "Sin eventos próximos",
        detail: "Crea un evento para verlo aquí.",
        urgency: "idle",
        item: null
      };
    }

    const eventDate = AG.EventService.getItemDate(nextItem);
    const distanceLabel = AG.ClockService.describeDistanceFromNow(eventDate);
    const diffMinutes = AG.ClockService.diffMinutesFromNow(eventDate);

    let urgency = "normal";

    if (diffMinutes !== null && diffMinutes <= 60) {
      urgency = "urgent";
    } else if (diffMinutes !== null && diffMinutes <= 1440) {
      urgency = "soon";
    }

    return {
      hasAlert: true,
      title: nextItem.title,
      detail: `${nextItem.date} ${nextItem.time || ""} · ${distanceLabel}`.trim(),
      urgency,
      item: nextItem
    };
  }

  function countToday(items) {
    return normalizeItems(items).filter((item) => {
      return AG.EventService.isToday(item) &&
        item.status !== CONFIG.STATUS.COMPLETED;
    }).length;
  }

  function countTomorrow(items) {
    return normalizeItems(items).filter((item) => {
      return AG.EventService.isTomorrow(item) &&
        item.status !== CONFIG.STATUS.COMPLETED;
    }).length;
  }

  function countActivePendings(items) {
    return normalizeItems(items).filter((item) => {
      return item.type === CONFIG.TYPES.PENDING &&
        item.status !== CONFIG.STATUS.COMPLETED;
    }).length;
  }

  function countPast(items) {
    return normalizeItems(items).filter((item) => {
      return AG.EventService.isPast(item);
    }).length;
  }

  function createSummary(items) {
    const safeItems = normalizeItems(items);
    const pendingSummary = AG.PendingService
      ? AG.PendingService.summarizePendings(safeItems)
      : { active: countActivePendings(safeItems) };

    const reminderSummary = AG.ReminderService
      ? AG.ReminderService.summarizeReminders(safeItems)
      : { total: 0, scheduled: 0, expired: 0, nextReminder: null };

    const alert = getNextAlert(safeItems);

    return {
      total: safeItems.length,
      nextItem: alert.item,
      nextAlert: alert,

      todayCount: countToday(safeItems),
      tomorrowCount: countTomorrow(safeItems),
      pendingCount: countActivePendings(safeItems),
      pastCount: countPast(safeItems),

      pendings: pendingSummary,
      reminders: reminderSummary,

      generatedAt: new Date().toISOString()
    };
  }

  function createCompactStats(items) {
    const summary = createSummary(items);

    return [
      {
        id: "next",
        label: "Próximo evento",
        value: summary.nextAlert.title,
        detail: summary.nextAlert.detail,
        status: summary.nextAlert.urgency
      },
      {
        id: "today",
        label: "Hoy",
        value: summary.todayCount,
        detail: "eventos o recordatorios"
      },
      {
        id: "tomorrow",
        label: "Mañana",
        value: summary.tomorrowCount,
        detail: "eventos programados"
      },
      {
        id: "pending",
        label: "Pendientes",
        value: summary.pendingCount,
        detail: "sin completar"
      }
    ];
  }

  AG.DashboardService = {
    getNextMainItem,
    getNextAlert,
    countToday,
    countTomorrow,
    countActivePendings,
    countPast,
    createSummary,
    createCompactStats
  };
})(window);