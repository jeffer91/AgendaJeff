/*
  Nombre completo: gc-local-clear.js
  Ruta: modulos/googlecalendar/storage/gc-local-clear.js

  Función:
    - Limpiar la conexión Google Calendar guardada localmente.
    - Permitir limpiar respaldo, diagnóstico y último resultado cuando se solicite.
    - Entregar un resultado estándar para UI y diagnóstico.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/storage/gc-local-read.js
    - modulos/googlecalendar/storage/gc-local-save.js
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
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(payload) {
          const data = payload && typeof payload === "object" ? payload : {};
          return {
            ok: Boolean(data.ok),
            status: data.status || (data.ok ? "cleared" : "error"),
            action: data.action || "clear",
            source: data.source || "local",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/storage/gc-local-clear.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function getLocalStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function removeKey(key) {
    const local = getLocalStorage();

    if (!local) {
      return {
        ok: false,
        key,
        error: { message: "localStorage no está disponible." }
      };
    }

    try {
      local.removeItem(key);
      return { ok: true, key, error: null };
    } catch (error) {
      return {
        ok: false,
        key,
        error: { message: error && error.message ? error.message : "No se pudo limpiar localStorage." }
      };
    }
  }

  function getKeysToClear(options) {
    const config = getConfig();
    const storageConfig = config.storage || {};
    const opts = options && typeof options === "object" ? options : {};
    const keys = [storageConfig.mainKey || "agendaJeff.googleCalendar.connection.v1"];

    if (opts.includeBackup === true || opts.all === true) {
      keys.push(storageConfig.backupKey || "agendaJeff.googleCalendar.backup.v1");
    }

    if (opts.includeAuth === true || opts.all === true) {
      keys.push(storageConfig.authKey || "agendaJeff.googleCalendar.auth.v1");
    }

    if (opts.includeDiagnostic === true || opts.all === true) {
      keys.push(storageConfig.diagnosticKey || "agendaJeff.googleCalendar.diagnostic.v1");
    }

    if (opts.includeLastResult === true || opts.all === true) {
      keys.push(storageConfig.lastResultKey || "agendaJeff.googleCalendar.lastResult.v1");
    }

    return keys.filter(function filterKey(key, index, list) {
      return key && list.indexOf(key) === index;
    });
  }

  function clearLocalConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const keys = getKeysToClear(options);
    const removals = keys.map(removeKey);
    const ok = removals.every(function everyRemoval(result) { return result.ok; });

    return createResult({
      ok,
      status: ok ? (config.status ? config.status.CLEARED : "cleared") : (config.status ? config.status.ERROR : "error"),
      action: config.action ? config.action.CLEAR : "clear",
      source: config.source ? config.source.LOCAL : "local",
      file: "modulos/googlecalendar/storage/gc-local-clear.js",
      message: ok
        ? "Conexión local Google Calendar limpiada correctamente."
        : "No se pudo limpiar completamente la conexión local Google Calendar.",
      error: ok ? null : {
        message: "Una o más claves locales no pudieron eliminarse.",
        file: "modulos/googlecalendar/storage/gc-local-clear.js"
      },
      data: { keys, removals }
    });
  }

  storage.removeKey = removeKey;
  storage.clearLocalConnection = clearLocalConnection;
})(window);
