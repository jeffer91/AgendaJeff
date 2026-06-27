/*
  Nombre completo: gc-api-events-read.js
  Ruta: modulos/googlecalendar/api/gc-api-events-read.js

  Función:
    - Leer eventos desde Google Calendar API.
    - Permitir rango de fechas, límite, orden y calendario específico.
    - No guardar datos; solo consulta API y devuelve resultado estándar.

  Se conecta con:
    - modulos/googlecalendar/api/gc-api-client.js
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-time.js
*/

(function initGoogleCalendarApiEventsRead(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const api = googleCalendar.Api = googleCalendar.Api || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getCreateResult() {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(payload) {
          const data = payload && typeof payload === "object" ? payload : {};
          return {
            ok: Boolean(data.ok),
            status: data.status || (data.ok ? "ready" : "error"),
            action: data.action || "readEvents",
            source: data.source || "google-calendar-api",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/api/gc-api-events-read.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function asText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function getTime() {
    return googleCalendar.Utils && googleCalendar.Utils.Time ? googleCalendar.Utils.Time : {};
  }

  function toIso(value) {
    const time = getTime();

    if (!value) {
      return "";
    }

    if (typeof time.toIso === "function") {
      return time.toIso(value);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function normalizeEvent(rawEvent) {
    const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};
    const start = event.start || {};
    const end = event.end || {};

    return {
      id: event.id || "",
      htmlLink: event.htmlLink || "",
      status: event.status || "",
      summary: event.summary || "",
      description: event.description || "",
      location: event.location || "",
      start: start.dateTime || start.date || "",
      end: end.dateTime || end.date || "",
      created: event.created || "",
      updated: event.updated || "",
      creator: event.creator || null,
      organizer: event.organizer || null,
      raw: event
    };
  }

  async function listEvents(input) {
    const config = getConfig();
    const createResult = getCreateResult();
    const data = input && typeof input === "object" ? input : {};
    const file = "modulos/googlecalendar/api/gc-api-events-read.js";
    const calendarId = encodeURIComponent(asText(data.calendarId) || (config.google ? config.google.defaultCalendarId : "primary"));

    if (!api.Client || typeof api.Client.requestJson !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ_EVENTS : "readEvents",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No está disponible Api.Client.requestJson. Revisa gc-api-client.js.",
        error: { message: "Falta cliente API.", file: "modulos/googlecalendar/api/gc-api-client.js" }
      });
    }

    const result = await api.Client.requestJson({
      path: "calendars/" + calendarId + "/events",
      method: "GET",
      action: config.action ? config.action.READ_EVENTS : "readEvents",
      query: {
        timeMin: toIso(data.timeMin || data.start || data.from) || undefined,
        timeMax: toIso(data.timeMax || data.end || data.to) || undefined,
        maxResults: data.maxResults || 20,
        singleEvents: data.singleEvents !== false,
        orderBy: data.orderBy || "startTime",
        q: data.q || data.search || undefined,
        pageToken: data.pageToken || undefined
      },
      auth: data.auth || {}
    });

    if (!result.ok) {
      return result;
    }

    const response = result.data && result.data.response ? result.data.response : {};
    const rawEvents = Array.isArray(response.items) ? response.items : [];
    const events = rawEvents.map(normalizeEvent);

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action: config.action ? config.action.READ_EVENTS : "readEvents",
      source: config.source ? config.source.GOOGLE : "google-calendar-api",
      file,
      message: "Eventos Google Calendar leídos correctamente.",
      data: {
        calendarId: decodeURIComponent(calendarId),
        events,
        count: events.length,
        nextPageToken: response.nextPageToken || "",
        rawResult: result
      }
    });
  }

  async function getEvent(calendarId, eventId, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/api/gc-api-events-read.js";
    const safeCalendarId = encodeURIComponent(asText(calendarId) || "primary");
    const safeEventId = encodeURIComponent(asText(eventId));

    if (!safeEventId) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: "getEvent",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No se puede leer un evento sin eventId.",
        error: { message: "Falta eventId.", file }
      });
    }

    if (!api.Client || typeof api.Client.requestJson !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: "getEvent",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No está disponible Api.Client.requestJson. Revisa gc-api-client.js.",
        error: { message: "Falta cliente API.", file: "modulos/googlecalendar/api/gc-api-client.js" }
      });
    }

    const result = await api.Client.requestJson({
      path: "calendars/" + safeCalendarId + "/events/" + safeEventId,
      method: "GET",
      action: "getEvent",
      auth: opts.auth || {}
    });

    if (!result.ok) {
      return result;
    }

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action: "getEvent",
      source: config.source ? config.source.GOOGLE : "google-calendar-api",
      file,
      message: "Evento Google Calendar leído correctamente.",
      data: {
        event: normalizeEvent(result.data ? result.data.response : null),
        rawResult: result
      }
    });
  }

  api.normalizeEvent = normalizeEvent;
  api.listEvents = listEvents;
  api.getEvent = getEvent;
})(window);
