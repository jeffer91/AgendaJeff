/*
  Nombre completo: tl-local-test.js
  Ruta: modulos/telegram/storage/tl-local-test.js

  Función:
    - Probar que localStorage esté disponible para el módulo Telegram.
    - Escribir, leer y borrar una clave temporal de prueba.
    - Reportar si el respaldo local puede usarse antes de depender de Firebase.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-time.js
    - modulos/telegram/storage/tl-local-read.js
    - modulos/telegram/storage/tl-local-save.js
    - modulos/telegram/storage/tl-local-clear.js
    - modulos/telegram/diagnostic/tl-diagnostic-local.js
*/

(function initTelegramLocalTest(global) {
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
        action: data.action || "testLocal",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/telegram/storage/tl-local-test.js",
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

  function testLocalStorage() {
    const config = getConfig();
    const utils = getUtils();
    const time = utils.Time || {};
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_TEST : "modulos/telegram/storage/tl-local-test.js";
    const action = config.action ? config.action.TEST_LOCAL : "testLocal";
    const source = config.source ? config.source.LOCAL : "local";
    const local = getLocalStorage();
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const testKey = "agendaJeff.telegram.localStorage.test";
    const testPayload = {
      module: "telegram",
      action,
      createdAt: now
    };

    if (!local) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "localStorage no está disponible en este entorno.",
        error: {
          message: "No existe acceso seguro a window.localStorage."
        },
        data: {
          testKey,
          canRead: false,
          canWrite: false,
          canRemove: false
        }
      });
    }

    try {
      local.setItem(testKey, JSON.stringify(testPayload));
      const raw = local.getItem(testKey);
      const parsed = raw ? JSON.parse(raw) : null;
      local.removeItem(testKey);
      const afterRemove = local.getItem(testKey);

      const canRead = Boolean(parsed && parsed.module === "telegram");
      const canRemove = afterRemove === null;
      const ok = canRead && canRemove;

      return createResult({
        ok,
        status: ok
          ? (config.status ? config.status.READY : "ready")
          : (config.status ? config.status.ERROR : "error"),
        action,
        source,
        file,
        message: ok
          ? "localStorage funciona correctamente para Telegram."
          : "localStorage respondió, pero la prueba no fue completamente válida.",
        error: ok
          ? null
          : {
              message: "La escritura, lectura o limpieza local no coincidió con lo esperado."
            },
        data: {
          testKey,
          canRead,
          canWrite: true,
          canRemove,
          payload: parsed
        }
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "Falló la prueba de localStorage para Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido probando localStorage."
        },
        data: {
          testKey,
          canRead: false,
          canWrite: false,
          canRemove: false
        }
      });
    }
  }

  function getLocalStorageSummary() {
    const config = getConfig();
    const local = getLocalStorage();
    const storageConfig = config.storage || {};
    const keys = {
      mainKey: storageConfig.mainKey || "agendaJeff.telegram.connection.v2",
      backupKey: storageConfig.backupKey || "agendaJeff.telegram.backup.v2",
      diagnosticKey: storageConfig.diagnosticKey || "agendaJeff.telegram.diagnostic.v2",
      lastResultKey: storageConfig.lastResultKey || "agendaJeff.telegram.lastResult.v2"
    };

    if (!local) {
      return {
        ok: false,
        available: false,
        keys,
        exists: {
          main: false,
          backup: false,
          diagnostic: false,
          lastResult: false
        },
        checkedAt: new Date().toISOString()
      };
    }

    return {
      ok: true,
      available: true,
      keys,
      exists: {
        main: local.getItem(keys.mainKey) !== null,
        backup: local.getItem(keys.backupKey) !== null,
        diagnostic: local.getItem(keys.diagnosticKey) !== null,
        lastResult: local.getItem(keys.lastResultKey) !== null
      },
      checkedAt: new Date().toISOString()
    };
  }

  storage.testLocalStorage = testLocalStorage;
  storage.getLocalStorageSummary = getLocalStorageSummary;
})(window);
