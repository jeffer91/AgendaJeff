/*
  Nombre completo: gc-mask.js
  Ruta: modulos/googlecalendar/utils/gc-mask.js

  Función:
    - Ocultar valores sensibles o largos antes de mostrarlos en UI, diagnóstico o conector público.
    - Evitar que la pantalla muestre credenciales completas.
    - Reutilizar máscaras para Client ID, Calendar ID y otros campos técnicos.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - futuras capas UI, diagnóstico y conector
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
    const visibleStart = Number.isFinite(Number(opts.visibleStart)) ? Number(opts.visibleStart) : 0;
    const visibleEnd = Number.isFinite(Number(opts.visibleEnd)) ? Number(opts.visibleEnd) : 4;
    const maskChar = typeof opts.maskChar === "string" && opts.maskChar ? opts.maskChar : "*";

    if (!text) {
      return "";
    }

    if (text.length <= visibleStart + visibleEnd) {
      return maskChar.repeat(Math.max(4, text.length));
    }

    const start = visibleStart > 0 ? text.slice(0, visibleStart) : "";
    const end = visibleEnd > 0 ? text.slice(-visibleEnd) : "";
    const hiddenLength = Math.max(4, text.length - start.length - end.length);

    return `${start}${maskChar.repeat(hiddenLength)}${end}`;
  }

  function maskClientId(value) {
    return maskText(value, {
      visibleStart: 0,
      visibleEnd: 8,
      maskChar: "*"
    });
  }

  function maskCalendarId(value) {
    const text = asText(value);

    if (text === "primary") {
      return "primary";
    }

    return maskText(text, {
      visibleStart: 3,
      visibleEnd: 6,
      maskChar: "*"
    });
  }

  function toPublicCredentials(data) {
    const value = data && typeof data === "object" ? data : {};

    return {
      activeCredentialType: value.activeCredentialType || "desktop",
      calendarId: value.calendarId || "primary",
      calendarIdMasked: value.calendarIdMasked || maskCalendarId(value.calendarId || "primary"),
      clientIdDesktopMasked: value.clientIdDesktopMasked || maskClientId(value.clientIdDesktop),
      clientIdWebMasked: value.clientIdWebMasked || maskClientId(value.clientIdWeb)
    };
  }

  utils.Mask = Object.freeze({
    asText,
    maskText,
    maskClientId,
    maskCalendarId,
    toPublicCredentials
  });
})(window);
