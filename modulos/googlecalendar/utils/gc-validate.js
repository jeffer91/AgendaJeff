/*
  Nombre completo: gc-validate.js
  Ruta: modulos/googlecalendar/utils/gc-validate.js

  Función:
    - Validar datos básicos de Google Calendar.
    - Validar borradores de eventos antes de enviarlos a la API.
    - Entregar errores claros para UI, diagnóstico y conexión.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/utils/gc-time.js
*/

(function initGoogleCalendarValidateUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const utils = googleCalendar.Utils = googleCalendar.Utils || {};

  function getNormalize() {
    return utils.Normalize || {};
  }

  function getTime() {
    return utils.Time || {};
  }

  function asText(value) {
    const normalize = getNormalize();

    if (typeof normalize.asText === "function") {
      return normalize.asText(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function makeError(field, message) {
    return {
      field,
      message,
      file: "modulos/googlecalendar/utils/gc-validate.js"
    };
  }

  function validateCalendarId(calendarId) {
    const value = asText(calendarId) || "primary";

    return {
      ok: value.length > 0,
      value,
      message: value.length > 0 ? "Calendar ID válido." : "Falta Calendar ID."
    };
  }

  function validateMode(value) {
    const mode = asText(value) || "desktop";
    const ok = ["desktop", "web"].includes(mode);

    return {
      ok,
      value: ok ? mode : "desktop",
      message: ok ? "Modo válido." : "Modo no soportado."
    };
  }

  function validateConnection(input) {
    const normalize = getNormalize();
    const data = typeof normalize.normalizeConnection === "function"
      ? normalize.normalizeConnection(input)
      : (input && typeof input === "object" ? input : {});
    const calendarCheck = validateCalendarId(data.calendarId);
    const modeCheck = validateMode(data.activeCredentialType);
    const errors = [];

    if (!calendarCheck.ok) {
      errors.push(makeError("calendarId", calendarCheck.message));
    }

    if (!modeCheck.ok) {
      errors.push(makeError("activeCredentialType", modeCheck.message));
    }

    return {
      ok: errors.length === 0,
      data: {
        ...data,
        calendarId: calendarCheck.value,
        activeCredentialType: modeCheck.value
      },
      errors,
      checks: {
        calendarId: calendarCheck,
        mode: modeCheck
      },
      message: errors.length === 0
        ? "Conexión Google Calendar válida para Bloque 1."
        : "Conexión Google Calendar incompleta o inválida."
    };
  }

  function validateEventDraft(input) {
    const normalize = getNormalize();
    const time = getTime();
    const eventDraft = typeof normalize.normalizeEventDraft === "function"
      ? normalize.normalizeEventDraft(input)
      : (input && typeof input === "object" ? input : {});
    const errors = [];

    if (!asText(eventDraft.title)) {
      errors.push(makeError("title", "Falta el título del evento."));
    }

    if (!asText(eventDraft.start)) {
      errors.push(makeError("start", "Falta la fecha y hora de inicio."));
    } else if (time.isValidDate && !time.isValidDate(eventDraft.start)) {
      errors.push(makeError("start", "La fecha de inicio no es válida."));
    }

    if (!asText(eventDraft.end)) {
      errors.push(makeError("end", "Falta la fecha y hora de fin."));
    } else if (time.isValidDate && !time.isValidDate(eventDraft.end)) {
      errors.push(makeError("end", "La fecha de fin no es válida."));
    }

    return {
      ok: errors.length === 0,
      data: eventDraft,
      errors,
      message: errors.length === 0
        ? "Borrador de evento válido."
        : "Borrador de evento incompleto o inválido."
    };
  }

  utils.Validate = Object.freeze({
    validateCalendarId,
    validateMode,
    validateConnection,
    validateEventDraft
  });
})(window);
