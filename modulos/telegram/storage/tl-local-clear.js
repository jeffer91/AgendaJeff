/*
  Nombre completo: tl-local-clear.js
  Ruta: modulos/telegram/storage/tl-local-clear.js

  Función:
    - Limpiar la conexión Telegram guardada en localStorage.
    - Permitir borrar también respaldo, diagnóstico y último resultado cuando se solicite.
    - Evitar que otros archivos manipulen directamente las claves locales.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/storage/tl-local-read.js
    - modulos/telegram/storage/tl-local-save.js
    - modulos/telegram/connection/tl-connection-clear.js
    - modulos/telegram/diagnostic/tl-diagnostic-local.js
*/

(function initTelegramLocalClear(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const storage = telegram.Storage = telegram.Storage || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getCreateResult() {
    if (typeof telegram.createResult === "function") {
      return telegram.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "cleared" : "error"),
        action: data.action || "clear",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/telegram/storage/tl-local-clear.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function getLocalStorage() {
    try {
      if (!global.localStorage) {
        return null;
      }

      return global.localStorage;
    } catch (error) {
      return null;
    }
  }

  function removeLocalKey(key) {
    const local = getLocalStorage();

    if (!local) {
      return {
        ok: false,
        key,
        error: {
          message: "localStorage no está disponible."
        }
      };
    }

    try {
      local.removeItem(key);

      return {
        ok: true,
        key,
        error: null
      };
    } catch (error) {
      return {
        ok: false,
        key,
        error: {
          message: error && error.message ? error.message : "No se pudo borrar la clave local."
        }
      };
    }
  }

  function getKeysToClear(options) {
    const config = getConfig();
    const storageConfig = config.storage || {};
    const opts = options && typeof options === "object" ? options : {};
    const keys = [storageConfig.mainKey || "agendaJeff.telegram.connection.v2"];

    if (opts.includeBackup === true) {
      keys.push(storageConfig.backupKey || "agendaJeff.telegram.backup.v2");
    }

    if (opts.includeDiagnostic === true) {
      keys.push(storageConfig.diagnosticKey || "agendaJeff.telegram.diagnostic.v2");
    }

    if (opts.includeLastResult === true) {
      keys.push(storageConfig.lastResultKey || "agendaJeff.telegram.lastResult.v2");
    }

    if (opts.all === true) {
      return [
        storageConfig.mainKey || "agendaJeff.telegram.connection.v2",
        storageConfig.backupKey || "agendaJeff.telegram.backup.v2",
        storageConfig.diagnosticKey || "agendaJeff.telegram.diagnostic.v2",
        storageConfig.lastResultKey || "agendaJeff.telegram.lastResult.v2"
      ];
    }

    return Array.from(new Set(keys));
  }

  function clearLocalConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_CLEAR : "modulos/telegram/storage/tl-local-clear.js";
    const action = config.action ? config.action.CLEAR : "clear";
    const source = config.source ? config.source.LOCAL : "local";
    const keys = getKeysToClear(options);
    const results = keys.map(removeLocalKey);
    const ok = results.every(function checkOk(result) {
      return result.ok;
    });

    const result = createResult({
      ok,
      status: ok
        ? (config.status ? config.status.CLEARED : "cleared")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: ok
        ? "Información local de Telegram limpiada correctamente."
        : "No se pudo limpiar toda la información local de Telegram.",
      error: ok
        ? null
        : results.filter(function filterErrors(item) {
            return !item.ok;
          }),
      data: {
        keys,
        results
      }
    });

    if (storage.saveLastLocalResult && typeof storage.saveLastLocalResult === "function") {
      storage.saveLastLocalResult(result);
    }

    return result;
  }

  function clearAllLocalTelegramData() {
    return clearLocalConnection({
      all: true
    });
  }

  storage.removeLocalKey = removeLocalKey;
  storage.clearLocalConnection = clearLocalConnection;
  storage.clearAllLocalTelegramData = clearAllLocalTelegramData;
})(window);
