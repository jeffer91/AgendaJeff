/*
  Nombre completo: gc-time.js
  Ruta: modulos/google-calendar/utils/gc-time.js

  Función:
    - Centralizar utilidades de fecha y hora para Google Calendar.
    - Generar fechas ISO seguras para Firebase, localStorage, diagnóstico y Google API.
    - Calcular vigencia de tokens OAuth.
    - Evitar repetir lógica de fechas en otros archivos.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/storage/*
    - modulos/google-calendar/firebase/*
    - modulos/google-calendar/oauth/gc-token.service.js
    - modulos/google-calendar/diagnostic/*
*/

(function initGoogleCalendarTimeUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const utils = googleCalendar.Utils = googleCalendar.Utils || {};

  function nowIso() {
    return new Date().toISOString();
  }

  function toIso(value) {
    if (!value) {
      return "";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString();
  }

  function safeTimestampLabel(value) {
    const iso = toIso(value) || nowIso();

    return iso.replace(/[:.]/g, "-");
  }

  function ageInSeconds(value) {
    const iso = toIso(value);

    if (!iso) {
      return null;
    }

    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  }

  function addSecondsToIso(value, seconds) {
    const base = toIso(value) || nowIso();
    const amount = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const date = new Date(base);

    date.setSeconds(date.getSeconds() + amount);
    return date.toISOString();
  }

  function isExpired(issuedAt, expiresInSeconds, safetySeconds) {
    const issuedIso = toIso(issuedAt);
    const expiresIn = Number(expiresInSeconds);
    const safety = Number.isFinite(Number(safetySeconds)) ? Number(safetySeconds) : 60;

    if (!issuedIso || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      return true;
    }

    const age = ageInSeconds(issuedIso);

    if (age === null) {
      return true;
    }

    return age >= Math.max(0, expiresIn - safety);
  }

  function getTokenExpiresAt(issuedAt, expiresInSeconds) {
    const issuedIso = toIso(issuedAt);
    const expiresIn = Number(expiresInSeconds);

    if (!issuedIso || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      return "";
    }

    return addSecondsToIso(issuedIso, expiresIn);
  }

  utils.Time = Object.freeze({
    nowIso,
    toIso,
    safeTimestampLabel,
    ageInSeconds,
    addSecondsToIso,
    isExpired,
    getTokenExpiresAt
  });
})(window);
