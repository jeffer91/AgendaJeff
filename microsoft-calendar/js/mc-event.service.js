/*
  Nombre completo: mc-event.service.js
  Ruta: microsoft-calendar/js/mc-event.service.js
  Función:
    - Crear eventos locales de prueba para Microsoft Calendar.
    - Crear evento automático en el siguiente minuto.
    - Crear evento manual desde los inputs.
    - Convertir eventos locales al formato que espera Microsoft Graph.
    - Normalizar y resumir eventos devueltos por Microsoft Graph.
  Se conecta con:
    - mc-config.js
    - mc-microsoft-api.js
    - mc-calendar.actions.js
*/

(function initMcEventService(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const CONFIG = MC.CONFIG;
  const Utils = MC.Utils;

  function getBrowserTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ||
        CONFIG.DEFAULT_TIME_ZONE;
    } catch (error) {
      return CONFIG.DEFAULT_TIME_ZONE;
    }
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function addMinutes(date, minutes) {
    const safeDate = new Date(date.getTime());
    safeDate.setMinutes(safeDate.getMinutes() + minutes);
    return safeDate;
  }

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());

    return `${year}-${month}-${day}`;
  }

  function formatLocalTime(date) {
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());

    return `${hour}:${minute}`;
  }

  function formatLocalDateTimeForMicrosoft(date) {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  function createNextMinuteDate() {
    const startDate = new Date();

    startDate.setSeconds(0, 0);
    startDate.setMinutes(startDate.getMinutes() + 1);

    return startDate;
  }

  function normalizeDurationMinutes(value) {
    const duration = Number(value || CONFIG.DEFAULT_EVENT_DURATION_MINUTES);

    if (!Number.isFinite(duration) || duration < 5) {
      return CONFIG.DEFAULT_EVENT_DURATION_MINUTES;
    }

    return Math.round(duration);
  }

  function createDateFromInput(dateValue, timeValue) {
    const date = Utils.cleanString(dateValue);
    const time = Utils.cleanString(timeValue);

    if (!date) {
      throw new Error("Falta la fecha del evento.");
    }

    if (!time) {
      throw new Error("Falta la hora del evento.");
    }

    const parsed = new Date(`${date}T${time}:00`);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error("La fecha u hora del evento no es válida.");
    }

    return parsed;
  }

  function validateLocalEvent(event) {
    if (!event || typeof event !== "object") {
      throw new Error("Falta la información del evento.");
    }

    if (!Utils.cleanString(event.title)) {
      throw new Error("Falta el título del evento.");
    }

    if (!Utils.cleanString(event.startLocal)) {
      throw new Error("Falta la fecha y hora de inicio del evento.");
    }

    if (!Utils.cleanString(event.endLocal)) {
      throw new Error("Falta la fecha y hora de finalización del evento.");
    }

    return true;
  }

  function createLocalEventFromDates(options) {
    const safeOptions = options || {};
    const title = Utils.cleanString(safeOptions.title);
    const description = Utils.cleanString(safeOptions.description);
    const startDate = safeOptions.startDate;
    const durationMinutes = normalizeDurationMinutes(safeOptions.durationMinutes);
    const endDate = addMinutes(startDate, durationMinutes);
    const timeZone = Utils.cleanString(safeOptions.timeZone) || getBrowserTimeZone();

    const localEvent = {
      id: `mc-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      description,
      date: formatLocalDate(startDate),
      time: formatLocalTime(startDate),
      durationMinutes,
      timeZone,
      startLocal: formatLocalDateTimeForMicrosoft(startDate),
      endLocal: formatLocalDateTimeForMicrosoft(endDate),
      createdAt: new Date().toISOString()
    };

    validateLocalEvent(localEvent);

    return localEvent;
  }

  function createAutomaticTestEventPayload(accountSlot, account) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safeAccount = account || {};
    const startDate = createNextMinuteDate();

    const title = `Evento de prueba Microsoft Calendar - ${Utils.getAccountLabel(slot)}`;

    const description = [
      "Evento creado automáticamente para verificar que Microsoft Calendar está funcionando.",
      "",
      "Origen: módulo Microsoft Calendar de AgendaJeff.",
      "Acción: botón Probar.",
      `Cuenta: ${Utils.cleanString(safeAccount.accountEmail) || Utils.getAccountLabel(slot)}`,
      "Este evento confirma que la app puede crear eventos reales en Microsoft Calendar.",
      `Creado desde la app el: ${new Date().toLocaleString("es-EC")}`
    ].join("\n");

    const localEvent = createLocalEventFromDates({
      title,
      description,
      startDate,
      durationMinutes: CONFIG.DEFAULT_EVENT_DURATION_MINUTES,
      timeZone: getBrowserTimeZone()
    });

    return {
      local: localEvent,
      microsoftEvent: toMicrosoftCalendarEvent(localEvent)
    };
  }

  function createTestEvent(input) {
    const safeInput = input || {};
    const title = Utils.cleanString(safeInput.title);
    const description = Utils.cleanString(safeInput.description);
    const startDate = createDateFromInput(safeInput.date, safeInput.time);

    if (!title) {
      throw new Error("Falta el título del evento.");
    }

    return createLocalEventFromDates({
      title,
      description,
      startDate,
      durationMinutes: safeInput.durationMinutes,
      timeZone: getBrowserTimeZone()
    });
  }

  function toMicrosoftCalendarEvent(localEvent) {
    validateLocalEvent(localEvent);

    const description = Utils.cleanString(localEvent.description) ||
      "Evento creado desde AgendaJeff.";

    return {
      subject: Utils.cleanString(localEvent.title),
      body: {
        contentType: "Text",
        content: description
      },
      start: {
        dateTime: Utils.cleanString(localEvent.startLocal),
        timeZone: Utils.cleanString(localEvent.timeZone) || CONFIG.DEFAULT_TIME_ZONE
      },
      end: {
        dateTime: Utils.cleanString(localEvent.endLocal),
        timeZone: Utils.cleanString(localEvent.timeZone) || CONFIG.DEFAULT_TIME_ZONE
      },
      isReminderOn: true,
      reminderMinutesBeforeStart: 15
    };
  }

  function normalizeMicrosoftEvent(event) {
    const safeEvent = event || {};

    return {
      id: Utils.cleanString(safeEvent.id),
      subject: Utils.cleanString(safeEvent.subject),
      bodyPreview: Utils.cleanString(safeEvent.bodyPreview),
      webLink: Utils.cleanString(safeEvent.webLink),
      start: safeEvent.start || null,
      end: safeEvent.end || null,
      location: safeEvent.location || null,
      createdDateTime: Utils.cleanString(safeEvent.createdDateTime),
      lastModifiedDateTime: Utils.cleanString(safeEvent.lastModifiedDateTime),
      isCancelled: Boolean(safeEvent.isCancelled),
      organizer: safeEvent.organizer || null
    };
  }

  function normalizeMicrosoftEventsList(payload) {
    if (Array.isArray(payload)) {
      return payload.map(normalizeMicrosoftEvent);
    }

    if (payload && Array.isArray(payload.value)) {
      return payload.value.map(normalizeMicrosoftEvent);
    }

    return [];
  }

  function summarizeEvents(events) {
    const safeEvents = Array.isArray(events) ? events : [];

    return safeEvents.map((event) => {
      const normalized = normalizeMicrosoftEvent(event);

      return {
        id: normalized.id,
        subject: normalized.subject,
        start: normalized.start,
        end: normalized.end,
        webLink: normalized.webLink,
        isCancelled: normalized.isCancelled
      };
    });
  }

  MC.EventService = {
    getBrowserTimeZone,
    formatLocalDateTimeForMicrosoft,
    createNextMinuteDate,
    createAutomaticTestEventPayload,
    createTestEvent,
    toMicrosoftCalendarEvent,
    normalizeMicrosoftEvent,
    normalizeMicrosoftEventsList,
    summarizeEvents
  };
})(window);