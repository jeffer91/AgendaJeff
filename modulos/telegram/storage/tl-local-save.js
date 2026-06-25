/*
  Nombre completo: tl-local-save.js
  Ruta: modulos/telegram/storage/tl-local-save.js

  Función:
    - Guardar la conexión Telegram en localStorage.
    - Crear un respaldo local automático con la misma información normalizada.
    - Guardar el último resultado local para diagnóstico.
    - Entregar respuestas estándar para conexión, diagnóstico y UI.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/utils/tl-time.js
    - modulos/telegram/storage/tl-local-read.js
    - modulos/telegram/connection/tl-connection-save.js
    - modulos/telegram/diagnostic/tl-diagnostic-local.js
*/

(function initTelegramLocalSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const storage = telegram.Storage = telegram.Storage || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getUtils() {
    return telegram.Utils || {};
  }

  function getCreateResult() {
    if (typeof telegram.createResult === "function") {
      return telegram.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "save",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/telegram/storage/tl-local-save.js",
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

  function prepareConnection(connection, options) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const time = utils.Time || {};
    const opts = options && typeof options === "object" ? options : {};
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();

    const base = {
      ...(connection && typeof connection === "object" ? connection : {}),
      source: opts.source || (config.source ? config.source.LOCAL : "local"),
      status: opts.status || (config.status ? config.status.READY : "ready"),
      lastAction: opts.action || (config.action ? config.action.SAVE : "save"),
      lastError: "",
      lastErrorFile: "",
      updatedAt: now,
      actualizadoEn: now,
      savedAt: now
    };

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(base, {
        source: base.source
      });
    }

    return base;
  }

  function writeJsonValue(key, value) {
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
      local.setItem(key, JSON.stringify(value));

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
          message: error && error.message ? error.message : "No se pudo escribir en localStorage."
        }
      };
    }
  }

  function saveLastLocalResult(result) {
    const config = getConfig();
    const key = config.storage ? config.storage.lastResultKey : "agendaJeff.telegram.lastResult.v2";
    const payload = result && typeof result === "object" ? result : {};

    return writeJsonValue(key, {
      ...payload,
      storedAt: new Date().toISOString()
    });
  }

  function saveLocalConnection(connection, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_SAVE : "modulos/telegram/storage/tl-local-save.js";
    const mainKey = config.storage ? config.storage.mainKey : "agendaJeff.telegram.connection.v2";
    const backupKey = config.storage ? config.storage.backupKey : "agendaJeff.telegram.backup.v2";
    const action = config.action ? config.action.SAVE : "save";
    const source = config.source ? config.source.LOCAL : "local";
    const opts = options && typeof options === "object" ? options : {};
    const normalized = prepareConnection(connection, {
      ...opts,
      action,
      source
    });

    const mainWrite = writeJsonValue(mainKey, normalized);
    const backupWrite = opts.skipBackup === true
      ? { ok: true, key: backupKey, skipped: true, error: null }
      : writeJsonValue(backupKey, normalized);

    const ok = mainWrite.ok && backupWrite.ok;

    const result = createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: ok
        ? "Conexión Telegram guardada en respaldo local."
        : "No se pudo guardar correctamente la conexión local.",
      error: ok
        ? null
        : {
            main: mainWrite.error,
            backup: backupWrite.error
          },
      data: {
        mainKey,
        backupKey,
        mainWrite,
        backupWrite,
        connection: normalized
      }
    });

    saveLastLocalResult(result);

    return result;
  }

  function saveLocalBackup(connection) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_SAVE : "modulos/telegram/storage/tl-local-save.js";
    const backupKey = config.storage ? config.storage.backupKey : "agendaJeff.telegram.backup.v2";
    const action = config.action ? config.action.SAVE : "save";
    const source = config.source ? config.source.LOCAL : "local";
    const normalized = prepareConnection(connection, {
      action,
      source
    });
    const backupWrite = writeJsonValue(backupKey, normalized);

    const result = createResult({
      ok: backupWrite.ok,
      status: backupWrite.ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: backupWrite.ok
        ? "Respaldo local guardado correctamente."
        : "No se pudo guardar el respaldo local.",
      error: backupWrite.error,
      data: {
        backupKey,
        backupWrite,
        connection: normalized
      }
    });

    saveLastLocalResult(result);

    return result;
  }

  storage.writeJsonValue = writeJsonValue;
  storage.saveLastLocalResult = saveLastLocalResult;
  storage.saveLocalConnection = saveLocalConnection;
  storage.saveLocalBackup = saveLocalBackup;
})(window);
