/*
  Nombre completo: gc-local-save.js
  Ruta: modulos/google-calendar/storage/gc-local-save.js

  Función:
    - Guardar conexión Google Calendar en localStorage.
    - Guardar respaldo local automático.
    - Guardar token OAuth localmente.
    - Guardar último resultado y diagnóstico local.
    - No tocar Firebase ni Google API.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/utils/gc-normalize.js
    - modulos/google-calendar/utils/gc-mask.js
    - modulos/google-calendar/utils/gc-time.js
    - modulos/google-calendar/storage/gc-local-read.js
    - modulos/google-calendar/connection/gc-connection-save.js
    - modulos/google-calendar/oauth/gc-token.service.js
*/

(function initGoogleCalendarLocalSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const storage = googleCalendar.Storage = googleCalendar.Storage || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getUtils() {
    return googleCalendar.Utils || {};
  }

  function getCreateResult() {
    if (typeof googleCalendar.createResult === "function") {
      return googleCalendar.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};
      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "save",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/google-calendar/storage/gc-local-save.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function hasLocalStorage() {
    try {
      return Boolean(global.localStorage);
    } catch (error) {
      return false;
    }
  }

  function writeJsonValue(key, value) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_SAVE : "modulos/google-calendar/storage/gc-local-save.js";

    if (!hasLocalStorage()) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.SAVE : "save",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "localStorage no está disponible para guardar Google Calendar.",
        error: {
          message: "localStorage no disponible.",
          file
        },
        data: { key }
      });
    }

    try {
      global.localStorage.setItem(key, JSON.stringify(value));

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.SAVE : "save",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "Valor guardado correctamente en localStorage.",
        data: {
          key,
          value
        }
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.SAVE : "save",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "No se pudo guardar en localStorage.",
        error: {
          message: error && error.message ? error.message : "Error guardando localStorage.",
          file
        },
        data: { key }
      });
    }
  }

  function normalizeConnection(input, options) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const time = utils.Time || {};
    const opts = options && typeof options === "object" ? options : {};
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const base = {
      ...(input && typeof input === "object" ? input : {}),
      source: opts.source || (config.source ? config.source.LOCAL : "local"),
      status: opts.status || (input && (input.status || input.estado)) || (config.status ? config.status.READY : "ready"),
      lastAction: opts.action || (config.action ? config.action.SAVE : "save"),
      ultimaAccion: opts.action || (config.action ? config.action.SAVE : "save"),
      updatedAt: now,
      actualizadoEn: now,
      savedAt: now
    };

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(base, {
        source: base.source,
        status: base.status
      });
    }

    return base;
  }

  function normalizeTokenState(input) {
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const time = utils.Time || {};
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const raw = input && typeof input === "object" ? input : {};
    const token = typeof normalize.normalizeTokenState === "function"
      ? normalize.normalizeTokenState(raw)
      : raw;

    const issuedAt = token.issuedAt || now;
    const expiresAt = token.expiresAt || (
      typeof time.getTokenExpiresAt === "function"
        ? time.getTokenExpiresAt(issuedAt, token.expiresIn)
        : ""
    );

    return {
      ...token,
      issuedAt,
      expiresAt,
      savedAt: now
    };
  }

  function saveLastLocalResult(result) {
    const config = getConfig();
    const key = config.storage ? config.storage.lastResultKey : "agendaJeff.googleCalendar.lastResult.v1";

    return writeJsonValue(key, result);
  }

  function saveLocalConnection(input, options) {
    const config = getConfig();
    const key = config.storage ? config.storage.mainKey : "agendaJeff.googleCalendar.connection.v1";
    const connection = normalizeConnection(input, options);
    const result = writeJsonValue(key, connection);

    saveLastLocalResult(result);

    if (result.ok && storage.saveLocalBackup && typeof storage.saveLocalBackup === "function") {
      storage.saveLocalBackup(connection, options);
    }

    return result;
  }

  function saveLocalBackup(input, options) {
    const config = getConfig();
    const key = config.storage ? config.storage.backupKey : "agendaJeff.googleCalendar.backup.v1";
    const connection = normalizeConnection(input, options);

    return writeJsonValue(key, connection);
  }

  function saveLocalTokenState(input) {
    const config = getConfig();
    const key = config.storage ? config.storage.tokenKey : "agendaJeff.googleCalendar.token.v1";
    const token = normalizeTokenState(input);
    const result = writeJsonValue(key, token);

    saveLastLocalResult(result);
    return result;
  }

  function saveLocalDiagnostic(report) {
    const config = getConfig();
    const key = config.storage ? config.storage.diagnosticKey : "agendaJeff.googleCalendar.diagnostic.v1";

    return writeJsonValue(key, report);
  }

  storage.writeJsonValue = writeJsonValue;
  storage.saveLastLocalResult = saveLastLocalResult;
  storage.saveLocalConnection = saveLocalConnection;
  storage.saveLocalBackup = saveLocalBackup;
  storage.saveLocalTokenState = saveLocalTokenState;
  storage.saveLocalDiagnostic = saveLocalDiagnostic;
})(window);
