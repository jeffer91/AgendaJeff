/*
  Nombre completo: gc-event.service.js
  Ruta: google-calendar/js/gc-event.service.js
  Función:
    - Crear un evento de prueba local.
    - Convertir el evento local al formato que acepta Google Calendar API.
    - Normalizar eventos recibidos desde Google Calendar.
    - Preparar una salida limpia para mostrar en pantalla y guardar en Firebase.
  Se conecta con:
    - gc-config.js
    - gc-google-api.js
    - gc-app.js

  Importante:
    - Este archivo NO crea eventos directamente.
    - Solo prepara datos.
    - Este archivo NO usa Telegram.
*/

(function initGcEventService(global) {
  "use strict";

  const GC = global.GC;
  const CONFIG = GC.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getBrowserTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil";
    } catch (error) {
      return "America/Guayaquil";
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

  function formatLocalDateTimeForGoogle(date) {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  function parseDurationMinutes(value) {
    const duration = Number(value);

    if (!Number.isFinite(duration)) {
      return CONFIG.DEFAULT_EVENT_DURATION_MINUTES;
    }

    if (duration < 5) {
      return 5;
    }

    if (duration > 1440) {
      return 1440;
    }

    return Math.round(duration);
  }

  function createLocalDate(dateValue, timeValue) {
    const date = normalizeText(dateValue);
    const time = normalizeText(timeValue);

    if (!date) {
      throw new Error("Falta la fecha del evento.");
    }

    if (!time) {
      throw new Error("Falta la hora del evento.");
    }

    const parsedDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("La fecha u hora del evento no es válida.");
    }

    return parsedDate;
  }

  function createTestEvent(input) {
    const safeInput = input || {};

    const title = normalizeText(safeInput.title);
    const date = normalizeText(safeInput.date);
    const time = normalizeText(safeInput.time);
    const description = normalizeText(safeInput.description);
    const durationMinutes = parseDurationMinutes(safeInput.durationMinutes);
    const timeZone = getBrowserTimeZone();

    if (!title) {
      throw new Error("Falta el título del evento.");
    }

    if (!date) {
      throw new Error("Falta la fecha del evento.");
    }

    if (!time) {
      throw new Error("Falta la hora del evento.");
    }

    const startDate = createLocalDate(date, time);
    const endDate = addMinutes(startDate, durationMinutes);

    return {
      id: `gc-event-${Date.now()}`,
      title,
      date,
      time,
      description,
      durationMinutes,
      timeZone,
      startLocal: formatLocalDateTimeForGoogle(startDate),
      endLocal: formatLocalDateTimeForGoogle(endDate),
      createdAt: new Date().toISOString()
    };
  }

  function toGoogleCalendarEvent(event) {
    if (!event || typeof event !== "object") {
      throw new Error("Falta el evento local.");
    }

    const title = normalizeText(event.title);
    const description = normalizeText(event.description);
    const startLocal = normalizeText(event.startLocal);
    const endLocal = normalizeText(event.endLocal);
    const timeZone = normalizeText(event.timeZone) || getBrowserTimeZone();

    if (!title) {
      throw new Error("Falta el título del evento.");
    }

    if (!startLocal || !endLocal) {
      throw new Error("Falta fecha de inicio o fin del evento.");
    }

    return {
      summary: title,
      description: [
        description || "Sin descripción.",
        "",
        "Creado desde AgendaJeff - Módulo Google Calendar independiente.",
        `ID local: ${normalizeText(event.id)}`
      ].join("\n"),
      start: {
        dateTime: startLocal,
        timeZone
      },
      end: {
        dateTime: endLocal,
        timeZone
      },
      reminders: {
        useDefault: true
      }
    };
  }

  function normalizeGoogleEvent(event) {
    const safeEvent = event && typeof event === "object" ? event : {};
    const start = safeEvent.start || {};
    const end = safeEvent.end || {};

    return {
      id: normalizeText(safeEvent.id),
      title: normalizeText(safeEvent.summary) || "Sin título",
      description: normalizeText(safeEvent.description),
      status: normalizeText(safeEvent.status),
      htmlLink: normalizeText(safeEvent.htmlLink),
      start: normalizeText(start.dateTime) || normalizeText(start.date),
      end: normalizeText(end.dateTime) || normalizeText(end.date),
      created: normalizeText(safeEvent.created),
      updated: normalizeText(safeEvent.updated)
    };
  }

  function normalizeGoogleEventsList(payload) {
    const items = payload && Array.isArray(payload.items) ? payload.items : [];

    return items.map(normalizeGoogleEvent);
  }

  function summarizeEvents(events) {
    const safeEvents = Array.isArray(events) ? events : [];

    return safeEvents.map((event) => ({
      id: normalizeText(event.id),
      title: normalizeText(event.title),
      start: normalizeText(event.start),
      end: normalizeText(event.end),
      status: normalizeText(event.status),
      htmlLink: normalizeText(event.htmlLink)
    }));
  }

  GC.EventService = {
    createTestEvent,
    toGoogleCalendarEvent,
    normalizeGoogleEvent,
    normalizeGoogleEventsList,
    summarizeEvents
  };
})(window);