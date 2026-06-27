/*
  Nombre completo: gc-normalize.js
  Ruta: modulos/googlecalendar/utils/gc-normalize.js

  Función:
    - Normalizar datos básicos de conexión Google Calendar.
    - Aceptar campos en español e inglés para mantener compatibilidad con Firestore.
    - Preparar objetos consistentes para Firebase, localStorage, diagnóstico y conector.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/config/gc-google-config.js
    - modulos/googlecalendar/utils/gc-time.js
    - modulos/googlecalendar/utils/gc-mask.js
*/

(function initGoogleCalendarNormalizeUtils(global) {
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

  function asBoolean(value, fallback) {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return Boolean(fallback);
  }

  function pickText(data, keys, fallback) {
    const source = data && typeof data === "object" ? data : {};

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const value = asText(source[key]);

      if (value) {
        return value;
      }
    }

    return asText(fallback);
  }

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getTime() {
    return utils.Time || {};
  }

  function normalizeCredentialType(value) {
    const googleConfig = googleCalendar.GoogleConfig || {};

    if (typeof googleConfig.normalizeCredentialType === "function") {
      return googleConfig.normalizeCredentialType(asText(value));
    }

    return asText(value) || "desktop";
  }

  function normalizeCalendarId(value) {
    return asText(value) || "primary";
  }

  function normalizeConnection(input, options) {
    const config = getConfig();
    const data = input && typeof input === "object" ? input : {};
    const opts = options && typeof options === "object" ? options : {};
    const time = getTime();
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const status = pickText(data, ["status", "estado"], config.defaults ? config.defaults.status : "idle");
    const calendarId = normalizeCalendarId(pickText(data, ["calendarId", "idCalendario"], "primary"));
    const activeCredentialType = normalizeCredentialType(pickText(data, ["activeCredentialType", "tipoCredencialActiva"], "desktop"));
    const updatedAt = pickText(data, ["updatedAt", "actualizadoEn"], now);

    return {
      ...data,
      enabled: asBoolean(data.enabled, true),
      provider: pickText(data, ["provider", "proveedor"], config.firebase ? config.firebase.provider : "googleCalendar"),
      proveedor: pickText(data, ["proveedor", "provider"], config.firebase ? config.firebase.provider : "googleCalendar"),
      appName: pickText(data, ["appName", "aplicacion"], config.firebase ? config.firebase.appName : "AgendaJeff"),
      activeCredentialType,
      calendarId,
      configured: asBoolean(data.configured, asBoolean(data.configurado, false)),
      configurado: asBoolean(data.configurado, asBoolean(data.configured, false)),
      status,
      estado: status,
      source: opts.source || pickText(data, ["source", "origen"], config.source ? config.source.MEMORY : "memory"),
      firebaseConnectionOk: asBoolean(data.firebaseConnectionOk, asBoolean(data.firebaseConexionOk, false)),
      firebaseConexionOk: asBoolean(data.firebaseConexionOk, asBoolean(data.firebaseConnectionOk, false)),
      googleConnectionOk: asBoolean(data.googleConnectionOk, false),
      calendarConnectionOk: asBoolean(data.calendarConnectionOk, false),
      fallbackUsed: asBoolean(data.fallbackUsed, false),
      runtimeMode: pickText(data, ["runtimeMode"], config.google ? config.google.runtimeMode : "desktop"),
      lastAction: pickText(data, ["lastAction", "ultimaAccion"], ""),
      ultimaAccion: pickText(data, ["ultimaAccion", "lastAction"], ""),
      lastError: pickText(data, ["lastError", "ultimoError"], ""),
      ultimoError: pickText(data, ["ultimoError", "lastError"], ""),
      lastErrorFile: pickText(data, ["lastErrorFile"], ""),
      lastCheckedAt: pickText(data, ["lastCheckedAt", "firebaseLastCheckAt", "firebaseUltimaRevisionEn"], ""),
      updatedAt,
      actualizadoEn: pickText(data, ["actualizadoEn", "updatedAt"], updatedAt)
    };
  }

  function normalizeEventDraft(input) {
    const data = input && typeof input === "object" ? input : {};

    return {
      title: pickText(data, ["title", "titulo", "summary"], "Evento AgendaJeff"),
      description: pickText(data, ["description", "descripcion"], ""),
      location: pickText(data, ["location", "ubicacion", "aula", "sede"], ""),
      start: pickText(data, ["start", "inicio", "startTime"], ""),
      end: pickText(data, ["end", "fin", "endTime"], ""),
      calendarId: normalizeCalendarId(pickText(data, ["calendarId"], "primary"))
    };
  }

  utils.Normalize = Object.freeze({
    asText,
    asBoolean,
    pickText,
    normalizeCredentialType,
    normalizeCalendarId,
    normalizeConnection,
    normalizeEventDraft
  });
})(window);
