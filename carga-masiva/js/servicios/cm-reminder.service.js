/*
  Nombre completo: cm-reminder.service.js
  Ruta: carga-masiva/js/servicios/cm-reminder.service.js

  Función:
    - Crear recordatorios estándar para eventos detectados por Carga Masiva.
    - Crear recordatorios especiales para eventos de todo el día.
    - Crear recordatorios especiales para defensas.
    - Normalizar recordatorios al formato que luego usará el Agendador.
    - No guarda eventos ni se conecta directamente con plataformas externas.

  Se conecta con:
    - cm-config.js
    - cm-normalizer.service.js
    - cm-validator.service.js
    - cm-import.service.js
    - conexiones/cm-agendador.adapter.js
*/

(function initCmReminderService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function parseISODate(dateText) {
    if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      return null;
    }

    const [year, month, day] = dateText.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function formatISODate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addDays(dateText, amount) {
    const date = parseISODate(dateText);

    if (!date) {
      return "";
    }

    date.setDate(date.getDate() + Number(amount || 0));
    return formatISODate(date);
  }

  function createReminderId(eventId, key) {
    return `${eventId || CM.createId("cm_event")}_rem_${key || CM.createId("key")}`;
  }

  function createReminder(event, config) {
    const reminderDate = config.date || addDays(event.startDate, config.amount || 0);

    if (!reminderDate) {
      return null;
    }

    return {
      id: createReminderId(event.id, config.key),
      eventId: event.id || "",
      batchId: event.batchId || "",
      key: config.key || "",
      label: config.label || "Recordatorio",
      date: reminderDate,
      time: config.time || event.startTime || "09:00",
      channel: "all",
      sent: false,
      createdAt: CM.nowISO()
    };
  }

  function createDefaultReminders(event) {
    return CONFIG.REMINDERS.DEFAULT_OFFSETS
      .map((item) => createReminder(event, item))
      .filter(Boolean);
  }

  function createAllDayReminders(event) {
    return CONFIG.REMINDERS.ALL_DAY_TIMES
      .map((item) => createReminder(event, {
        ...item,
        date: event.startDate,
        amount: 0
      }))
      .filter(Boolean);
  }

  function createDefenseReminders(event) {
    return CONFIG.REMINDERS.DEFENSE_OFFSETS
      .map((item) => createReminder(event, item))
      .filter(Boolean);
  }

  function createReminders(event, settings) {
    const safeSettings = settings || {};
    const reminderSettings = safeSettings.reminders || CONFIG.DEFAULT_SETTINGS.reminders;

    if (!event || !event.startDate) {
      return [];
    }

    if (event.allDay && reminderSettings.allDay !== false) {
      return createAllDayReminders(event);
    }

    if (event.type === CONFIG.EVENT_TYPES.DEFENSE && reminderSettings.defense !== false) {
      return createDefenseReminders(event);
    }

    if (reminderSettings.default === false) {
      return [];
    }

    return createDefaultReminders(event);
  }

  function attachReminders(event, settings) {
    const reminders = createReminders(event, settings);

    return {
      ...event,
      reminders
    };
  }

  CM.ReminderService = {
    parseISODate,
    formatISODate,
    addDays,
    createReminder,
    createDefaultReminders,
    createAllDayReminders,
    createDefenseReminders,
    createReminders,
    attachReminders
  };
})(window);