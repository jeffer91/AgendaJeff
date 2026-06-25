/*
  Nombre completo: gc-local-clear.js
  Ruta: modulos/google-calendar/storage/gc-local-clear.js

  Función:
    - Limpiar conexión Google Calendar desde localStorage.
    - Limpiar respaldo local, token OAuth, diagnóstico y último resultado cuando se solicite.
    - No tocar Firebase ni Google API.
    - Mantener la limpieza local separada de la limpieza remota.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/storage/gc-local-read.js
    - modulos/google-calendar/storage/gc-local-save.js
    - modulos/google-calendar/connection/gc-connection-clear.js
    - modulos/google-calendar/oauth/gc-token.service.js
*/

(function initGoogleCalendarLocalClear(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const storage = googleCalendar.Storage = googleCalendar.Storage || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getCreateResult() {
    if (typeof googleCalendar.createResult === "function") {
      return googleCalendar.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};
      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "cleared" : "error"),
        action: data.action || "clear",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/google-calendar/storage/gc-local-clear.js",
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

  function removeLocalKey(key) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_CLEAR : "modulos/google-calendar/storage/gc-local-clear.js";

    if (!hasLocalStorage()) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.CLEAR : "clear",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "localStorage no está disponible para limpiar Google Calendar.",
        error: {
          message: "localStorage no disponible.",
          file
        },
        data: { key }
      });
    }

    try {
      const existed = global.localStorage.getItem(key) !== null;
      global.localStorage.removeItem(key);

      return createResult({
        ok: true,
        status: config.status ? config.status.CLEARED : "cleared",
        action: config.action ? config.action.CLEAR : "clear",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: existed ? "Clave local eliminada." : "La clave local no existía.",
        data: {
          key,
          existed
        }
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.CLEAR : "clear",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "No se pudo eliminar la clave local.",
        error: {
          message: error && error.message ? error.message : "Error limpiando localStorage.",
          file
        },
        data: { key }
      });
    }
  }

  function clearLocalConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const keys = [];

    keys.push(config.storage ? config.storage.mainKey : "agendaJeff.googleCalendar.connection.v1");

    if (opts.includeBackup === true || opts.all === true) {
      keys.push(config.storage ? config.storage.backupKey : "agendaJeff.googleCalendar.backup.v1");
    }

    if (opts.includeToken === true || opts.all === true) {
      keys.push(config.storage ? config.storage.tokenKey : "agendaJeff.googleCalendar.token.v1");
    }

    if (opts.includeDiagnostic === true || opts.all === true) {
      keys.push(config.storage ? config.storage.diagnosticKey : "agendaJeff.googleCalendar.diagnostic.v1");
    }

    if (opts.includeLastResult === true || opts.all === true) {
      keys.push(config.storage ? config.storage.lastResultKey : "agendaJeff.googleCalendar.lastResult.v1");
    }

    const results = keys.map(removeLocalKey);
    const ok = results.every(function everyOk(result) {
      return result.ok;
    });

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.CLEARED : "cleared")
        : (config.status ? config.status.ERROR : "error"),
      action: config.action ? config.action.CLEAR : "clear",
      source: config.source ? config.source.LOCAL : "local",
      file: config.fileHints ? config.fileHints.LOCAL_CLEAR : "modulos/google-calendar/storage/gc-local-clear.js",
      message: ok
        ? "Datos locales de Google Calendar limpiados correctamente."
        : "Uno o más datos locales de Google Calendar no pudieron limpiarse.",
      error: ok ? null : {
        message: "Falló una limpieza local.",
        file: config.fileHints ? config.fileHints.LOCAL_CLEAR : "modulos/google-calendar/storage/gc-local-clear.js"
      },
      data: {
        keys,
        results
      }
    });
  }

  function clearLocalTokenState() {
    const config = getConfig();
    const key = config.storage ? config.storage.tokenKey : "agendaJeff.googleCalendar.token.v1";

    return removeLocalKey(key);
  }

  function clearAllLocalGoogleCalendarData() {
    return clearLocalConnection({ all: true });
  }

  storage.removeLocalKey = removeLocalKey;
  storage.clearLocalConnection = clearLocalConnection;
  storage.clearLocalTokenState = clearLocalTokenState;
  storage.clearAllLocalGoogleCalendarData = clearAllLocalGoogleCalendarData;
})(window);
