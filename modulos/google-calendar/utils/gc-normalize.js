/*
  Nombre completo: gc-normalize.js
  Ruta: modulos/google-calendar/utils/gc-normalize.js

  Función:
    - Normalizar datos del módulo Google Calendar.
    - Aceptar alias en español e inglés para compatibilidad con Firebase.
    - Unificar campos como clientId, clientSecret, redirectUri, calendarId, accountEmail, status y fechas.
    - Preparar una conexión estable para storage, Firebase, OAuth, API y diagnóstico.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/utils/gc-mask.js
    - modulos/google-calendar/storage/*
    - modulos/google-calendar/firebase/*
    - modulos/google-calendar/oauth/*
    - modulos/google-calendar/connection/*
*/

(function initGoogleCalendarNormalizeUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const utils = googleCalendar.Utils = googleCalendar.Utils || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

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

    if (value === "true" || value === "1" || value === 1) {
      return true;
    }

    if (value === "false" || value === "0" || value === 0) {
      return false;
    }

    return Boolean(fallback);
  }

  function pickStatus(value) {
    const config = getConfig();
    const statuses = config.status || {};
    const text = asText(value).toLowerCase();
    const allowed = Object.keys(statuses).map(function mapKey(key) {
      return statuses[key];
    });

    return allowed.includes(text) ? text : (statuses.IDLE || "idle");
  }

  function pickSource(value) {
    const config = getConfig();
    const sources = config.source || {};
    const text = asText(value).toLowerCase();
    const allowed = Object.keys(sources).map(function mapKey(key) {
      return sources[key];
    });

    return allowed.includes(text) ? text : (sources.NONE || "none");
  }

  function normalizeClientId(value) {
    return asText(value).replace(/\s+/g, "");
  }

  function normalizeClientSecret(value) {
    return asText(value).replace(/\s+/g, "");
  }

  function normalizeRedirectUri(value) {
    return asText(value);
  }

  function normalizeCalendarId(value) {
    const config = getConfig();
    return asText(value) || (config.google ? config.google.defaultCalendarId : "primary");
  }

  function normalizeAccountEmail(value) {
    return asText(value).toLowerCase();
  }

  function normalizeConnection(input, options) {
    const config = getConfig();
    const opts = options && typeof options === "object" ? options : {};
    const defaults = typeof googleCalendar.getDefaultConnection === "function"
      ? googleCalendar.getDefaultConnection()
      : {};
    const data = input && typeof input === "object" ? input : {};
    const status = pickStatus(data.status || data.estado || opts.status || defaults.status);
    const source = pickSource(data.source || data.fuente || opts.source || defaults.source);
    const clientId = normalizeClientId(data.clientId || data.googleClientId || data.oauthClientId || "");
    const clientSecret = normalizeClientSecret(data.clientSecret || data.googleClientSecret || data.oauthClientSecret || "");
    const redirectUri = normalizeRedirectUri(data.redirectUri || data.redirectURL || data.redirect_uri || "");
    const calendarId = normalizeCalendarId(data.calendarId || data.calendarioId || data.calendar || "");
    const accountEmail = normalizeAccountEmail(data.accountEmail || data.email || data.googleEmail || "");

    const connection = {
      ...defaults,
      ...data,
      enabled: asBoolean(data.enabled, defaults.enabled !== false),
      provider: data.provider || (config.firebase ? config.firebase.provider : "google-calendar"),
      appName: data.appName || data.aplicacion || (config.firebase ? config.firebase.appName : "AgendaJeff"),
      aplicacion: data.aplicacion || data.appName || (config.firebase ? config.firebase.appName : "AgendaJeff"),
      collection: data.collection || data.coleccion || (config.firebase ? config.firebase.collection : "conexiones"),
      coleccion: data.coleccion || data.collection || (config.firebase ? config.firebase.collection : "conexiones"),
      document: data.document || data.documento || (config.firebase ? config.firebase.document : "google-calendar"),
      documento: data.documento || data.document || (config.firebase ? config.firebase.document : "google-calendar"),
      clientId,
      clientSecret,
      redirectUri,
      calendarId,
      accountEmail,
      status,
      estado: status,
      source,
      clientConfigured: Boolean(clientId),
      secretConfigured: Boolean(clientSecret),
      calendarConfigured: Boolean(calendarId),
      redirectConfigured: Boolean(redirectUri),
      googleAuthorized: asBoolean(data.googleAuthorized || data.authorized || data.autorizado, false),
      firebaseConnectionOk: asBoolean(data.firebaseConnectionOk || data.firebaseConexionOk, false),
      firebaseConexionOk: asBoolean(data.firebaseConexionOk || data.firebaseConnectionOk, false),
      googleConnectionOk: asBoolean(data.googleConnectionOk || data.googleConexionOk, false),
      googleConexionOk: asBoolean(data.googleConexionOk || data.googleConnectionOk, false),
      lastAction: data.lastAction || data.ultimaAccion || "",
      ultimaAccion: data.ultimaAccion || data.lastAction || "",
      lastError: data.lastError || data.lastErrorMessage || data.ultimoError || "",
      lastErrorMessage: data.lastErrorMessage || data.lastError || data.ultimoError || "",
      lastErrorFile: data.lastErrorFile || "",
      lastErrorAt: data.lastErrorAt || "",
      lastCheckedAt: data.lastCheckedAt || data.firebaseLastCheck || data.googleLastCheck || "",
      updatedAt: data.updatedAt || data.actualizadoEn || data.savedAt || "",
      actualizadoEn: data.actualizadoEn || data.updatedAt || data.savedAt || "",
      savedAt: data.savedAt || data.guardadoEn || ""
    };

    if (utils.Mask && typeof utils.Mask.maskConnection === "function") {
      return utils.Mask.maskConnection(connection);
    }

    return connection;
  }

  function normalizeTokenState(input) {
    const data = input && typeof input === "object" ? input : {};

    return {
      accessToken: asText(data.accessToken || data.access_token),
      expiresIn: Number.isFinite(Number(data.expiresIn || data.expires_in))
        ? Number(data.expiresIn || data.expires_in)
        : null,
      scope: asText(data.scope),
      tokenType: asText(data.tokenType || data.token_type),
      issuedAt: asText(data.issuedAt),
      expiresAt: asText(data.expiresAt),
      accountEmail: normalizeAccountEmail(data.accountEmail || data.email || "")
    };
  }

  function normalizeError(error, file) {
    if (!error) {
      return {
        message: "Error desconocido.",
        file: file || ""
      };
    }

    if (typeof error === "string") {
      return {
        message: error,
        file: file || ""
      };
    }

    return {
      message: error.message || error.error || "Error desconocido.",
      file: error.file || file || "",
      code: error.code || "",
      details: error.details || null
    };
  }

  utils.Normalize = Object.freeze({
    asText,
    asBoolean,
    pickStatus,
    pickSource,
    normalizeClientId,
    normalizeClientSecret,
    normalizeRedirectUri,
    normalizeCalendarId,
    normalizeAccountEmail,
    normalizeConnection,
    normalizeTokenState,
    normalizeError
  });
})(window);
