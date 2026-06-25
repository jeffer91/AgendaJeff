/*
  Nombre completo: gc-validate.js
  Ruta: modulos/google-calendar/utils/gc-validate.js

  Función:
    - Validar datos mínimos de conexión para Google Calendar.
    - Validar clientId, clientSecret opcional, redirectUri opcional, calendarId y token OAuth.
    - Evitar que storage, Firebase, OAuth, API y UI repitan validaciones.
    - Entregar errores claros con archivo probable.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/utils/gc-normalize.js
    - modulos/google-calendar/oauth/gc-token.service.js
    - modulos/google-calendar/connection/*
    - modulos/google-calendar/diagnostic/*
*/

(function initGoogleCalendarValidateUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const utils = googleCalendar.Utils = googleCalendar.Utils || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function asText(value) {
    if (utils.Normalize && typeof utils.Normalize.asText === "function") {
      return utils.Normalize.asText(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function validateClientId(clientId) {
    const config = getConfig();
    const value = asText(clientId).replace(/\s+/g, "");
    const file = config.fileHints ? config.fileHints.CONFIG : "modulos/google-calendar/config/gc-config.js";

    if (!value) {
      return {
        ok: false,
        field: "clientId",
        value,
        file,
        message: "Falta el Client ID de Google."
      };
    }

    if (!value.includes(".apps.googleusercontent.com")) {
      return {
        ok: false,
        field: "clientId",
        value,
        file,
        message: "El Client ID de Google debe terminar en .apps.googleusercontent.com."
      };
    }

    return {
      ok: true,
      field: "clientId",
      value,
      file,
      message: "Client ID válido."
    };
  }

  function validateClientSecret(clientSecret, options) {
    const opts = options && typeof options === "object" ? options : {};
    const value = asText(clientSecret).replace(/\s+/g, "");

    if (!value && opts.required === true) {
      return {
        ok: false,
        field: "clientSecret",
        value,
        file: getConfig().fileHints ? getConfig().fileHints.CONFIG : "modulos/google-calendar/config/gc-config.js",
        message: "Falta el Client Secret de Google."
      };
    }

    return {
      ok: true,
      field: "clientSecret",
      value,
      required: opts.required === true,
      message: value ? "Client Secret presente." : "Client Secret no requerido para Google Identity Services."
    };
  }

  function validateRedirectUri(redirectUri, options) {
    const opts = options && typeof options === "object" ? options : {};
    const value = asText(redirectUri);

    if (!value && opts.required === true) {
      return {
        ok: false,
        field: "redirectUri",
        value,
        file: getConfig().fileHints ? getConfig().fileHints.CONFIG : "modulos/google-calendar/config/gc-config.js",
        message: "Falta el Redirect URI de Google."
      };
    }

    if (value && !/^https?:\/\//i.test(value) && !/^http:\/\/localhost/i.test(value)) {
      return {
        ok: false,
        field: "redirectUri",
        value,
        file: getConfig().fileHints ? getConfig().fileHints.CONFIG : "modulos/google-calendar/config/gc-config.js",
        message: "El Redirect URI debe ser una URL válida."
      };
    }

    return {
      ok: true,
      field: "redirectUri",
      value,
      required: opts.required === true,
      message: value ? "Redirect URI válido." : "Redirect URI no requerido para autorización por token popup."
    };
  }

  function validateCalendarId(calendarId) {
    const config = getConfig();
    const value = asText(calendarId) || (config.google ? config.google.defaultCalendarId : "primary");

    if (!value) {
      return {
        ok: false,
        field: "calendarId",
        value,
        file: config.fileHints ? config.fileHints.CONFIG : "modulos/google-calendar/config/gc-config.js",
        message: "Falta el Calendar ID de Google Calendar."
      };
    }

    return {
      ok: true,
      field: "calendarId",
      value,
      message: "Calendar ID válido."
    };
  }

  function validateAccountEmail(accountEmail) {
    const value = asText(accountEmail).toLowerCase();

    if (!value) {
      return {
        ok: true,
        field: "accountEmail",
        value,
        optional: true,
        message: "Correo de cuenta Google opcional."
      };
    }

    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    return {
      ok: valid,
      field: "accountEmail",
      value,
      message: valid ? "Correo de cuenta válido." : "El correo de cuenta Google no tiene formato válido."
    };
  }

  function validateConnection(input, options) {
    const opts = options && typeof options === "object" ? options : {};
    const normalize = utils.Normalize || {};
    const data = typeof normalize.normalizeConnection === "function"
      ? normalize.normalizeConnection(input, { source: getConfig().source ? getConfig().source.USER : "user" })
      : (input && typeof input === "object" ? input : {});

    const checks = [
      validateClientId(data.clientId),
      validateClientSecret(data.clientSecret, { required: opts.requireClientSecret === true }),
      validateRedirectUri(data.redirectUri, { required: opts.requireRedirectUri === true }),
      validateCalendarId(data.calendarId),
      validateAccountEmail(data.accountEmail)
    ];

    const errors = checks.filter(function filterInvalid(check) {
      return !check.ok;
    });

    return {
      ok: errors.length === 0,
      data,
      checks,
      errors,
      message: errors.length === 0
        ? "Conexión Google Calendar válida."
        : "La conexión Google Calendar tiene datos incompletos o inválidos."
    };
  }

  function validateTokenState(tokenState) {
    const time = utils.Time || {};
    const normalize = utils.Normalize || {};
    const token = typeof normalize.normalizeTokenState === "function"
      ? normalize.normalizeTokenState(tokenState)
      : (tokenState && typeof tokenState === "object" ? tokenState : {});

    const hasAccessToken = Boolean(token.accessToken);
    const expired = typeof time.isExpired === "function"
      ? time.isExpired(token.issuedAt, token.expiresIn, 60)
      : true;

    if (!hasAccessToken) {
      return {
        ok: false,
        token,
        expired: true,
        message: "No existe access token de Google."
      };
    }

    if (expired) {
      return {
        ok: false,
        token,
        expired: true,
        message: "El access token de Google expiró o no tiene fecha válida."
      };
    }

    return {
      ok: true,
      token,
      expired: false,
      message: "Access token de Google válido."
    };
  }

  function validateRequiredElement(element, name) {
    return {
      ok: Boolean(element),
      name: name || "element",
      message: element ? "Elemento encontrado." : `No se encontró el elemento ${name || "element"}.`
    };
  }

  utils.Validate = Object.freeze({
    validateClientId,
    validateClientSecret,
    validateRedirectUri,
    validateCalendarId,
    validateAccountEmail,
    validateConnection,
    validateTokenState,
    validateRequiredElement
  });
})(window);
