/*
  Nombre completo: tl-connection-test.js
  Ruta: modulos/telegram/connection/tl-connection-test.js

  Función:
    - Probar la conexión completa de Telegram.
    - Leer conexión desde Firebase o respaldo local.
    - Validar botToken y chatId.
    - Probar Telegram API con getMe y mensaje de prueba.
    - Actualizar Firebase y respaldo local con el resultado de la prueba.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/connection/tl-connection-save.js
    - modulos/telegram/api/tl-api-test.js
    - modulos/telegram/storage/tl-local-save.js
    - modulos/telegram/firebase/tl-firebase-save.js
    - modulos/telegram/diagnostic/tl-diagnostic-telegram.js
*/

(function initTelegramConnectionTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const connection = telegram.Connection = telegram.Connection || {};

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
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "testTelegram",
        source: data.source || "system",
        message: data.message || "",
        file: data.file || "modulos/telegram/connection/tl-connection-test.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function getConnectionFromReadResult(readResult) {
    if (!readResult || !readResult.data) {
      return null;
    }

    return readResult.data.connection || null;
  }

  function buildTestedConnection(baseConnection, testResult, checkedAt) {
    const config = getConfig();
    const status = testResult && testResult.ok
      ? (config.status ? config.status.READY : "ready")
      : (config.status ? config.status.ERROR : "error");
    const action = config.action ? config.action.TEST_TELEGRAM : "testTelegram";
    const errorMessage = testResult && testResult.error && testResult.error.message
      ? testResult.error.message
      : "";
    const errorFile = testResult && testResult.error && testResult.error.file
      ? testResult.error.file
      : "";

    return {
      ...(baseConnection && typeof baseConnection === "object" ? baseConnection : {}),
      status,
      estado: status,
      telegramConnectionOk: Boolean(testResult && testResult.ok),
      lastAction: action,
      ultimaAccion: action,
      lastError: testResult && testResult.ok ? "" : errorMessage,
      lastErrorMessage: testResult && testResult.ok ? "" : errorMessage,
      lastErrorFile: testResult && testResult.ok ? "" : errorFile,
      lastCheckedAt: checkedAt,
      telegramLastCheck: checkedAt,
      updatedAt: checkedAt,
      actualizadoEn: checkedAt
    };
  }

  async function persistTestResult(testedConnection) {
    const config = getConfig();
    const storage = telegram.Storage || {};
    const firebaseLayer = telegram.Firebase || {};
    const localResult = storage.saveLocalConnection && typeof storage.saveLocalConnection === "function"
      ? storage.saveLocalConnection(testedConnection, {
          source: config.source ? config.source.LOCAL : "local",
          status: testedConnection.status
        })
      : null;

    const firebaseResult = firebaseLayer.saveFirebaseConnection && typeof firebaseLayer.saveFirebaseConnection === "function"
      ? await firebaseLayer.saveFirebaseConnection(testedConnection)
      : null;

    return {
      localResult,
      firebaseResult,
      localOk: Boolean(localResult && localResult.ok),
      firebaseOk: Boolean(firebaseResult && firebaseResult.ok)
    };
  }

  async function testConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTION_TEST : "modulos/telegram/connection/tl-connection-test.js";
    const action = config.action ? config.action.TEST_TELEGRAM : "testTelegram";
    const source = config.source ? config.source.SYSTEM : "system";
    const checkedAt = new Date().toISOString();
    const api = telegram.Api || {};

    let readResult = null;
    let baseConnection = null;

    if (opts.connection && typeof opts.connection === "object") {
      baseConnection = opts.connection;
    } else if (connection.readConnection && typeof connection.readConnection === "function") {
      readResult = await connection.readConnection();
      baseConnection = getConnectionFromReadResult(readResult);
    }

    if (!baseConnection) {
      return createResult({
        ok: false,
        status: config.status ? config.status.IDLE : "idle",
        action,
        source,
        file,
        message: "No se encontró una conexión Telegram para probar.",
        error: {
          message: "No existe conexión en Firebase ni respaldo local.",
          file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
        },
        data: {
          readResult
        },
        checkedAt
      });
    }

    if (!api.testTelegramApi || typeof api.testTelegramApi !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible testTelegramApi. Revisa tl-api-test.js.",
        error: {
          message: "Falta función testTelegramApi.",
          file: config.fileHints ? config.fileHints.API_TEST : "modulos/telegram/api/tl-api-test.js"
        },
        data: {
          readResult,
          connection: baseConnection
        },
        checkedAt
      });
    }

    const apiTestResult = await api.testTelegramApi(baseConnection);
    const testedConnection = buildTestedConnection(baseConnection, apiTestResult, checkedAt);
    const persistResult = opts.skipPersist === true
      ? {
          localResult: null,
          firebaseResult: null,
          localOk: false,
          firebaseOk: false,
          skipped: true
        }
      : await persistTestResult(testedConnection);

    return createResult({
      ok: Boolean(apiTestResult && apiTestResult.ok),
      status: apiTestResult && apiTestResult.ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: apiTestResult && apiTestResult.ok
        ? "Conexión Telegram probada correctamente."
        : "La prueba completa de conexión Telegram falló.",
      error: apiTestResult && apiTestResult.ok ? null : apiTestResult ? apiTestResult.error : {
        message: "Prueba Telegram sin respuesta.",
        file
      },
      data: {
        readResult,
        apiTestResult,
        persistResult,
        connection: testedConnection
      },
      checkedAt
    });
  }

  connection.testConnection = testConnection;
})(window);
