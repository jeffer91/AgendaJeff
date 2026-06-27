/*
  Nombre completo: gc-api-calendars.js
  Ruta: modulos/googlecalendar/api/gc-api-calendars.js

  Función:
    - Leer calendarios disponibles desde Google Calendar API.
    - Obtener información de un calendario específico.
    - No guardar datos; solo consulta API y devuelve resultado estándar.

  Se conecta con:
    - modulos/googlecalendar/api/gc-api-client.js
    - modulos/googlecalendar/config/gc-config.js
*/

(function initGoogleCalendarApiCalendars(global) {
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
            action: data.action || "readCalendars",
            source: data.source || "google-calendar-api",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/api/gc-api-calendars.js",
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

  async function listCalendars(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/api/gc-api-calendars.js";

    if (!api.Client || typeof api.Client.requestJson !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: "readCalendars",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No está disponible Api.Client.requestJson. Revisa gc-api-client.js.",
        error: { message: "Falta cliente API.", file: "modulos/googlecalendar/api/gc-api-client.js" }
      });
    }

    const result = await api.Client.requestJson({
      path: "users/me/calendarList",
      method: "GET",
      action: "readCalendars",
      query: {
        maxResults: opts.maxResults || 50,
        minAccessRole: opts.minAccessRole || undefined,
        showHidden: typeof opts.showHidden === "boolean" ? opts.showHidden : undefined,
        showDeleted: typeof opts.showDeleted === "boolean" ? opts.showDeleted : undefined,
        pageToken: opts.pageToken || undefined
      },
      auth: opts.auth || {}
    });

    if (!result.ok) {
      return result;
    }

    const response = result.data && result.data.response ? result.data.response : {};
    const calendars = Array.isArray(response.items) ? response.items : [];

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action: "readCalendars",
      source: config.source ? config.source.GOOGLE : "google-calendar-api",
      file,
      message: "Calendarios Google leídos correctamente.",
      data: {
        calendars,
        count: calendars.length,
        nextPageToken: response.nextPageToken || "",
        rawResult: result
      }
    });
  }

  async function getCalendar(calendarId, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/api/gc-api-calendars.js";
    const id = encodeURIComponent(asText(calendarId) || "primary");

    if (!api.Client || typeof api.Client.requestJson !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: "getCalendar",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No está disponible Api.Client.requestJson. Revisa gc-api-client.js.",
        error: { message: "Falta cliente API.", file: "modulos/googlecalendar/api/gc-api-client.js" }
      });
    }

    const result = await api.Client.requestJson({
      path: "calendars/" + id,
      method: "GET",
      action: "getCalendar",
      auth: opts.auth || {}
    });

    if (!result.ok) {
      return result;
    }

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action: "getCalendar",
      source: config.source ? config.source.GOOGLE : "google-calendar-api",
      file,
      message: "Calendario Google leído correctamente.",
      data: {
        calendar: result.data ? result.data.response : null,
        rawResult: result
      }
    });
  }

  api.listCalendars = listCalendars;
  api.getCalendar = getCalendar;
})(window);
