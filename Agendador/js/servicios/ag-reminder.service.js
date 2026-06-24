/*
  Nombre completo: ag-reminder.service.js
  Ruta: Agendador/js/servicios/ag-reminder.service.js

  Función:
    - Convertir recordatorios seleccionados en recordatorios reales.
    - Calcular fecha y hora de activación de cada recordatorio.
    - Preparar recordatorios para notificaciones desktop, Telegram, Firebase y segundo plano Electron.
    - Evitar recordatorios inválidos o duplicados.
    - No pinta interfaz.
    - No guarda directamente en localStorage.
*/

(function initAgReminderService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function nowIso() {
    return AG.Storage && typeof AG.Storage.nowIso === "function"
      ? AG.Storage.nowIso()
      : new Date().toISOString();
  }

  function getBaseDate(item) {
    if (!item || !item.date) {
      return null;
    }

    const time = normalizeText(item.time) || "08:00";
    const parsedDate = new Date(`${item.date}T${time}:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function cloneDate(date) {
    return new Date(date.getTime());
  }

  function setTime(date, hour, minute) {
    const safeDate = cloneDate(date);
    safeDate.setHours(hour, minute, 0, 0);
    return safeDate;
  }

  function parseReminderCode(code) {
    const value = normalizeText(code);

    const map = {
      "5d": { code: "5d", label: "5 días antes", type: "daysBefore", amount: 5, unit: "day" },
      "3d": { code: "3d", label: "3 días antes", type: "daysBefore", amount: 3, unit: "day" },
      "2d": { code: "2d", label: "2 días antes", type: "daysBefore", amount: 2, unit: "day" },
      "1d": { code: "1d", label: "1 día antes", type: "daysBefore", amount: 1, unit: "day" },
      "0d": { code: "0d", label: "Mismo día", type: "sameDay", amount: 0, unit: "day" },
      "30m": { code: "30m", label: "30 minutos antes", type: "minutesBefore", amount: 30, unit: "minute" }
    };

    return map[value] || null;
  }

  function calculateReminderDate(baseDate, reminderDefinition) {
    if (!(baseDate instanceof Date) || !reminderDefinition) {
      return null;
    }

    const reminderDate = cloneDate(baseDate);

    if (reminderDefinition.type === "daysBefore") {
      reminderDate.setDate(reminderDate.getDate() - reminderDefinition.amount);
      return reminderDate;
    }

    if (reminderDefinition.type === "sameDay") {
      const sameDayReminder = setTime(baseDate, 8, 0);

      if (sameDayReminder.getTime() >= baseDate.getTime()) {
        const fallback = cloneDate(baseDate);
        fallback.setMinutes(fallback.getMinutes() - 30);
        return fallback;
      }

      return sameDayReminder;
    }

    if (reminderDefinition.type === "minutesBefore") {
      reminderDate.setMinutes(reminderDate.getMinutes() - reminderDefinition.amount);
      return reminderDate;
    }

    return null;
  }

  function formatLocalDateTime(date) {
    if (!(date instanceof Date)) {
      return "";
    }

    return [
      date.getFullYear(),
      pad2(date.getMonth() + 1),
      pad2(date.getDate())
    ].join("-") + "T" + [
      pad2(date.getHours()),
      pad2(date.getMinutes()),
      "00"
    ].join(":");
  }

  function createReminderMessage(item, reminder) {
    const safeItem = item || {};
    const safeReminder = reminder || {};

    return [
      `Recordatorio: ${safeItem.title || "Sin título"}`,
      `Fecha del evento: ${safeItem.date || "sin fecha"} ${safeItem.time || ""}`.trim(),
      `Aviso: ${safeReminder.label || "recordatorio"}`,
      safeItem.description ? `Detalle: ${safeItem.description}` : "",
      safeItem.responsible && safeItem.responsible.name
        ? `Responsable: ${safeItem.responsible.name}`
        : ""
    ].filter(Boolean).join("\n");
  }

  function buildReminderSchedule(item) {
    const safeItem = item || {};
    const baseDate = getBaseDate(safeItem);
    const reminderCodes = Array.isArray(safeItem.reminders)
      ? safeItem.reminders
      : CONFIG.DEFAULT_REMINDERS;

    if (!baseDate) {
      return [];
    }

    const reminders = reminderCodes
      .map(parseReminderCode)
      .filter(Boolean)
      .map((definition) => {
        const triggerDate = calculateReminderDate(baseDate, definition);

        if (!triggerDate) {
          return null;
        }

        const reminder = {
          id: `${safeItem.id || "item"}-${definition.code}`,
          itemId: safeItem.id || "",
          itemTitle: safeItem.title || "",
          title: safeItem.title || "Recordatorio AgendaJeff",
          body: "",
          description: safeItem.description || "",
          type: safeItem.type || CONFIG.TYPES.EVENT,
          priority: safeItem.priority || CONFIG.PRIORITIES.NORMAL,
          code: definition.code,
          label: definition.label,
          triggerAt: triggerDate.toISOString(),
          reminderAt: triggerDate.toISOString(),
          triggerLocal: formatLocalDateTime(triggerDate),
          eventAt: baseDate.toISOString(),
          eventLocal: formatLocalDateTime(baseDate),
          date: safeItem.date || "",
          time: safeItem.time || "",
          status: triggerDate.getTime() < Date.now() ? "expired" : "scheduled",
          channels: Array.isArray(safeItem.channels) ? safeItem.channels : CONFIG.DEFAULT_CHANNELS,
          responsible: safeItem.responsible || CONFIG.DEFAULT_RESPONSIBLE,
          createdAt: nowIso()
        };

        reminder.body = createReminderMessage(safeItem, reminder);
        return reminder;
      })
      .filter(Boolean);

    const uniqueByCode = {};
    reminders.forEach((reminder) => {
      uniqueByCode[reminder.code] = reminder;
    });

    return Object.values(uniqueByCode).sort((first, second) => {
      return new Date(first.triggerAt).getTime() - new Date(second.triggerAt).getTime();
    });
  }

  function buildBackgroundReminders(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems
      .flatMap(buildReminderSchedule)
      .filter((reminder) => reminder.status === "scheduled")
      .map((reminder) => ({
        ...reminder,
        source: CONFIG.SOURCE || "agendador-local",
        backgroundReady: true
      }));
  }

  async function syncWithElectron(items) {
    const bridge = global.AgendaJeffElectron || global.parent?.AgendaJeffElectron || global.top?.AgendaJeffElectron;

    if (!bridge || !bridge.background || typeof bridge.background.syncReminders !== "function") {
      return {
        ok: false,
        mode: "web",
        message: "Electron no está disponible para sincronizar recordatorios."
      };
    }

    return bridge.background.syncReminders(buildBackgroundReminders(items));
  }

  function getFutureReminders(item) {
    return buildReminderSchedule(item).filter((reminder) => reminder.status === "scheduled");
  }

  function getExpiredReminders(item) {
    return buildReminderSchedule(item).filter((reminder) => reminder.status === "expired");
  }

  function summarizeReminders(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const allReminders = safeItems.flatMap(buildReminderSchedule);
    const scheduled = allReminders.filter((reminder) => reminder.status === "scheduled");
    const expired = allReminders.filter((reminder) => reminder.status === "expired");

    return {
      total: allReminders.length,
      scheduled: scheduled.length,
      expired: expired.length,
      nextReminder: scheduled[0] || null
    };
  }

  AG.ReminderService = {
    parseReminderCode,
    calculateReminderDate,
    buildReminderSchedule,
    buildBackgroundReminders,
    syncWithElectron,
    getFutureReminders,
    getExpiredReminders,
    summarizeReminders,
    createReminderMessage,
    formatLocalDateTime
  };
})(window);
