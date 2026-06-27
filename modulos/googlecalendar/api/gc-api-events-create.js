/*
  Nombre completo: gc-api-events-create.js
  Ruta: modulos/googlecalendar/api/gc-api-events-create.js

  Función:
    - Crear eventos en Google Calendar API.
    - Convertir datos simples de AgendaJeff a payload compatible con Google Calendar.
    - Validar título, inicio, fin y calendario antes del envío.

  Se conecta con:
    - modulos/googlecalendar/api/gc-api-client.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/utils/gc-validate.js
    - modulos/googlecalendar/config/gc-config.js
*/

(function initGoogleCalendarApiEventsCreate(global) {
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
            action: data.action || "createEvent",
            source: data.source || "google-calendar-api",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/api/gc-api-events-create.js",
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

  function getNormalize() {
    return googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};
  }

  function getValidate() {
    return googleCalendar.Utils && googleCalendar.Utils.Validate ? googleCalendar.Utils.Validate : {};
  }

  function getTime() {
    return googleCalendar.Utils && googleCalendar.Utils.Time ? googleCalendar.Utils.Time : {};
  }

  function toDateTimeValue(value) {
    const time = getTime();

    if (typeof time.toIso === "function") {
      return time.toIso(value) || asText(value);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? asText(value) : date.toISOString();
  }

  function buildReminderPayload(reminders) {
    if (!reminders || typeof reminders !== "object") {
      return undefined;
    }

    if (reminders.useDefault === true) {
      return { useDefault: true };
    }

    const overrides = Array.isArray(reminders.overrides)
      ? reminders.overrides
          .filter(function filterReminder(item) { return item && item.method && Number.isFinite(Number(item.minutes)); })
          .map(function mapReminder(item) {
            return { method: item.method, minutes: Number(item.minutes) };
          })
      : [];

    return { useDefault: false, overrides };
  }

  function buildGoogleEventPayload(input) {
    const normalize = getNormalize();
    const draft = typeof normalize.normalizeEventDraft === "function"
      ? normalize.normalizeEventDraft(input)
      : (input && typeof input === "object" ? input : {});
    const source = input && typeof input === "object" ? input : {};
    const payload = {
      summary: draft.title || draft.summary || "Evento AgendaJeff",
      description: draft.description || "",
      location: draft.location || "",
      start: {
        dateTime: toDateTimeValue(draft.start),
        timeZone: source.timeZone || source.timezone || undefined
      },
      end: {
        dateTime: toDateTimeValue(draft.end),
        timeZone: source.timeZone || source.timezone || undefined
      }
    };

    if (Array.isArray(source.attendees) && source.attendees.length > 0) {
      payload.attendees = source.attendees
        .map(function mapAttendee(item) {
          if (typeof item === "string") {
            return { email: item };
          }

          if (item && typeof item === "object" && item.email) {
            return { email: item.email, displayName: item.displayName || undefined };
          }

          return null;
        })
        .filter(Boolean);
    }

    const reminders = buildReminderPayload(source.reminders);

    if (reminders) {
      payload.reminders = reminders;
    }

    if (source.colorId) {
      payload.colorId = String(source.colorId);
    }

    if (source.transparency) {
      payload.transparency = source.transparency;
    }

    return {
      calendarId: draft.calendarId || source.calendarId || "primary",
      event: payload,
      draft
    };
  }

  function validateCreateInput(input) {
    const validate = getValidate();

    if (typeof validate.validateEventDraft === "function") {
      return validate.validateEventDraft(input);
    }

    const data = input && typeof input === "object" ? input : {};
    const errors = [];

    if (!asText(data.title || data.summary)) {
      errors.push({ field: "title", message: "Falta el título del evento." });
    }

    if (!asText(data.start || data.startTime)) {
      errors.push({ field: "start", message: "Falta inicio del evento." });
    }

    if (!asText(data.end || data.endTime)) {
      errors.push({ field: "end", message: "Falta fin del evento." });
    }

    return {
      ok: errors.length === 0,
      data,
      errors,
      message: errors.length === 0 ? "Evento válido." : "Evento incompleto."
    };
  }

  async function createEvent(input, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/api/gc-api-events-create.js";
    const validation = validateCreateInput(input);

    if (!validation.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.CREATE_EVENT : "createEvent",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No se puede crear el evento porque faltan datos.",
        error: {
          message: validation.errors.map(function mapError(item) { return item.message; }).join(" "),
          file
        },
        data: { validation }
      });
    }

    if (!api.Client || typeof api.Client.requestJson !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.CREATE_EVENT : "createEvent",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No está disponible Api.Client.requestJson. Revisa gc-api-client.js.",
        error: { message: "Falta cliente API.", file: "modulos/googlecalendar/api/gc-api-client.js" }
      });
    }

    const payload = buildGoogleEventPayload(input);
    const calendarId = encodeURIComponent(payload.calendarId || "primary");
    const result = await api.Client.requestJson({
      path: "calendars/" + calendarId + "/events",
      method: "POST",
      action: config.action ? config.action.CREATE_EVENT : "createEvent",
      query: {
        sendUpdates: opts.sendUpdates || undefined,
        conferenceDataVersion: opts.conferenceDataVersion || undefined
      },
      body: payload.event,
      auth: opts.auth || (input && input.auth ? input.auth : {})
    });

    if (!result.ok) {
      return result;
    }

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action: config.action ? config.action.CREATE_EVENT : "createEvent",
      source: config.source ? config.source.GOOGLE : "google-calendar-api",
      file,
      message: "Evento creado correctamente en Google Calendar.",
      data: {
        calendarId: payload.calendarId,
        event: result.data ? result.data.response : null,
        sentPayload: payload.event,
        rawResult: result
      }
    });
  }

  async function createTestEvent(options) {
    const opts = options && typeof options === "object" ? options : {};
    const now = new Date();
    const start = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 40 * 60 * 1000).toISOString();

    return createEvent({
      title: opts.title || "Prueba AgendaJeff · Google Calendar",
      description: opts.description || "Evento de prueba creado desde el módulo Google Calendar de AgendaJeff.",
      location: opts.location || "AgendaJeff",
      start,
      end,
      calendarId: opts.calendarId || "primary",
      auth: opts.auth || {}
    }, opts);
  }

  api.buildGoogleEventPayload = buildGoogleEventPayload;
  api.createEvent = createEvent;
  api.createTestEvent = createTestEvent;
})(window);
