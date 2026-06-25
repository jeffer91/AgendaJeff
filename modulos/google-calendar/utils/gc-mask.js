/*
  Nombre completo: gc-mask.js
  Ruta: modulos/google-calendar/utils/gc-mask.js

  Función:
    - Enmascarar datos sensibles del módulo Google Calendar.
    - Ocultar clientId, clientSecret, accessToken, refreshToken y correos cuando sea necesario.
    - Preparar datos seguros para UI, diagnóstico y logs.
    - Evitar que otros archivos repitan lógica de seguridad visual.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/utils/gc-normalize.js
    - modulos/google-calendar/storage/*
    - modulos/google-calendar/firebase/*
    - modulos/google-calendar/ui/render/*
*/

(function initGoogleCalendarMaskUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const utils = googleCalendar.Utils = googleCalendar.Utils || {};

  function asText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function maskText(value, options) {
    const text = asText(value);
    const opts = options && typeof options === "object" ? options : {};
    const visibleStart = Number.isFinite(opts.visibleStart) ? opts.visibleStart : 0;
    const visibleEnd = Number.isFinite(opts.visibleEnd) ? opts.visibleEnd : 4;
    const maskChar = opts.maskChar || "*";

    if (!text) {
      return "";
    }

    if (text.length <= visibleStart + visibleEnd) {
      return maskChar.repeat(text.length);
    }

    return [
      text.slice(0, visibleStart),
      maskChar.repeat(Math.max(4, text.length - visibleStart - visibleEnd)),
      text.slice(text.length - visibleEnd)
    ].join("");
  }

  function maskClientId(clientId) {
    return maskText(clientId, {
      visibleStart: 6,
      visibleEnd: 24,
      maskChar: "*"
    });
  }

  function maskClientSecret(clientSecret) {
    return maskText(clientSecret, {
      visibleStart: 0,
      visibleEnd: 4,
      maskChar: "*"
    });
  }

  function maskToken(token) {
    return maskText(token, {
      visibleStart: 0,
      visibleEnd: 6,
      maskChar: "*"
    });
  }

  function maskEmail(email) {
    const text = asText(email);
    const parts = text.split("@");

    if (parts.length !== 2) {
      return maskText(text, {
        visibleStart: 1,
        visibleEnd: 4,
        maskChar: "*"
      });
    }

    const name = parts[0];
    const domain = parts[1];

    return `${maskText(name, { visibleStart: 1, visibleEnd: 1, maskChar: "*" })}@${domain}`;
  }

  function maskConnection(connection) {
    const data = connection && typeof connection === "object" ? connection : {};

    return {
      ...data,
      clientIdMasked: data.clientIdMasked || maskClientId(data.clientId),
      clientSecretMasked: data.clientSecretMasked || maskClientSecret(data.clientSecret),
      accessTokenMasked: data.accessTokenMasked || maskToken(data.accessToken),
      refreshTokenMasked: data.refreshTokenMasked || maskToken(data.refreshToken),
      accountEmailMasked: data.accountEmailMasked || maskEmail(data.accountEmail)
    };
  }

  function sanitizeForDisplay(value, seen) {
    const visited = seen || new WeakSet();

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== "object") {
      return value;
    }

    if (visited.has(value)) {
      return "[circular]";
    }

    visited.add(value);

    if (Array.isArray(value)) {
      return value.map(function mapItem(item) {
        return sanitizeForDisplay(item, visited);
      });
    }

    const clean = {};

    Object.keys(value).forEach(function eachKey(key) {
      const item = value[key];

      if (["clientSecret", "accessToken", "refreshToken", "idToken", "secret", "password"].includes(key)) {
        clean[key] = item ? maskToken(item) : "";
        return;
      }

      if (key === "clientId") {
        clean[key] = item ? maskClientId(item) : "";
        return;
      }

      if (key === "accountEmail" || key === "email") {
        clean[key] = item ? maskEmail(item) : "";
        return;
      }

      clean[key] = sanitizeForDisplay(item, visited);
    });

    return clean;
  }

  utils.Mask = Object.freeze({
    maskText,
    maskClientId,
    maskClientSecret,
    maskToken,
    maskEmail,
    maskConnection,
    sanitizeForDisplay
  });
})(window);
