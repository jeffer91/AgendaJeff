/*
  Nombre completo: tl-local-read.js
  Ruta: modulos/telegram/storage/tl-local-read.js

  Función:
    - Leer la conexión Telegram guardada en localStorage.
    - Leer el respaldo local cuando la conexión principal no exista o falle.
    - Normalizar los datos locales antes de entregarlos a conexión, diagnóstico o UI.
    - Reportar errores claros de lectura local.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/utils/tl-time.js
    - modulos/telegram/storage/tl-local-save.js
    - modulos/telegram/storage/tl-local-test.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/diagnostic/tl-diagnostic-local.js
*/

(function initTelegramLocalRead(global) {
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
        action: data.action || "read",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/telegram/storage/tl-local-read.js",
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

  function safeJsonParse(rawValue, key) {
    if (!rawValue) {
      return {
        ok: false,
        exists: false,
        key,
        value: null,
        error: null,
        message: "No existe información local para esta clave."
      };
    }

    try {
      return {
        ok: true,
        exists: true,
        key,
        value: JSON.parse(rawValue),
        error: null,
        message: "Información local leída correctamente."
      };
    } catch (error) {
      return {
        ok: false,
        exists: true,
        key,
        value: null,
        error: {
          message: error && error.message ? error.message : "JSON local inválido."
        },
        message: "La información local existe, pero no se pudo interpretar."
      };
    }
  }

  function readRawLocalValue(key) {
    const local = getLocalStorage();

    if (!local) {
      return {
        ok: false,
        exists: false,
        key,
        rawValue: "",
        error: {
          message: "localStorage no está disponible."
        }
      };
    }

    try {
      const rawValue = local.getItem(key);

      return {
        ok: true,
        exists: rawValue !== null,
        key,
        rawValue: rawValue || "",
        error: null
      };
    } catch (error) {
      return {
        ok: false,
        exists: false,
        key,
        rawValue: "",
        error: {
          message: error && error.message ? error.message : "No se pudo leer localStorage."
        }
      };
    }
  }

  function normalizeLocalConnection(value, source) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const data = value && typeof value === "object" ? value : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source: source || (config.source ? config.source.LOCAL : "local")
      });
    }

    return {
      ...data,
      source: source || "local"
    };
  }

  function readLocalByKey(key, label) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_READ : "modulos/telegram/storage/tl-local-read.js";
    const action = config.action ? config.action.READ : "read";
    const source = config.source ? config.source.LOCAL : "local";
    const raw = readRawLocalValue(key);

    if (!raw.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: raw.error && raw.error.message ? raw.error.message : "No se pudo leer localStorage.",
        error: raw.error,
        data: {
          key,
          label: label || key,
          exists: false
        }
      });
    }

    const parsed = safeJsonParse(raw.rawValue, key);

    if (!parsed.ok) {
      return createResult({
        ok: false,
        status: parsed.exists
          ? (config.status ? config.status.ERROR : "error")
          : (config.status ? config.status.IDLE : "idle"),
        action,
        source,
        file,
        message: parsed.message,
        error: parsed.error,
        data: {
          key,
          label: label || key,
          exists: parsed.exists
        }
      });
    }

    const normalized = normalizeLocalConnection(parsed.value, source);

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action,
      source,
      file,
      message: "Conexión local leída correctamente.",
      data: {
        key,
        label: label || key,
        exists: true,
        connection: normalized
      }
    });
  }

  function readLocalConnection() {
    const config = getConfig();
    const key = config.storage ? config.storage.mainKey : "agendaJeff.telegram.connection.v2";

    return readLocalByKey(key, "main");
  }

  function readLocalBackup() {
    const config = getConfig();
    const key = config.storage ? config.storage.backupKey : "agendaJeff.telegram.backup.v2";

    return readLocalByKey(key, "backup");
  }

  function readLocalConnectionWithFallback() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_READ : "modulos/telegram/storage/tl-local-read.js";
    const mainResult = readLocalConnection();

    if (mainResult.ok) {
      return mainResult;
    }

    const backupResult = readLocalBackup();

    if (backupResult.ok) {
      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "Se usó el respaldo local porque la conexión principal no estaba disponible.",
        data: {
          usedFallback: true,
          mainResult,
          backupResult,
          connection: backupResult.data ? backupResult.data.connection : null
        }
      });
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.IDLE : "idle",
      action: config.action ? config.action.READ : "read",
      source: config.source ? config.source.LOCAL : "local",
      file,
      message: "No hay conexión local ni respaldo local disponible.",
      data: {
        usedFallback: false,
        mainResult,
        backupResult
      }
    });
  }

  function hasLocalBackup() {
    const backupResult = readLocalBackup();

    return Boolean(backupResult && backupResult.ok);
  }

  storage.readRawLocalValue = readRawLocalValue;
  storage.readLocalConnection = readLocalConnection;
  storage.readLocalBackup = readLocalBackup;
  storage.readLocalConnectionWithFallback = readLocalConnectionWithFallback;
  storage.hasLocalBackup = hasLocalBackup;
})(window);
