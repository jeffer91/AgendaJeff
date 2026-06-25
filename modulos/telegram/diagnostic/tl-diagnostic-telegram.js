/*
  Nombre completo: tl-diagnostic-telegram.js
  Ruta: modulos/telegram/diagnostic/tl-diagnostic-telegram.js

  Función:
    - Diagnosticar Telegram API para el módulo Telegram.
    - Validar datos de conexión disponibles.
    - Probar el bot con getMe.
    - Opcionalmente enviar mensaje de prueba si se solicita.
    - No guardar en Firebase ni localStorage.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/api/tl-api-getme.js
    - modulos/telegram/api/tl-api-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
*/

(function initTelegramDiagnosticTelegram(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const diagnostic = telegram.Diagnostic = telegram.Diagnostic || {};

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
        action: data.action || "diagnostic",
        source: data.source || "telegram-api",
        message: data.message || "",
        file: data.file || "modulos/telegram/diagnostic/tl-diagnostic-telegram.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function validateConnection(connection) {
    const utils = getUtils();

    if (utils.Validate && typeof utils.Validate.validateConnection === "function") {
      return utils.Validate.validateConnection(connection);
    }

    const data = connection && typeof connection === "object" ? connection : {};
    const errors = [];

    if (!data.botToken) {
      errors.push({ field: "botToken", message: "Falta el Bot Token de Telegram." });
    }

    if (!data.chatId) {
      errors.push({ field: "chatId", message: "Falta el Chat ID de Telegram." });
    }

    return {
      ok: errors.length === 0,
      data,
      errors,
      message: errors.length === 0 ? "Datos completos." : "Datos incompletos."
    };
  }

  async function resolveConnection(options) {
    const opts = options && typeof options === "object" ? options : {};
    const connectionLayer = telegram.Connection || {};

    if (opts.connection && typeof opts.connection === "object") {
      return {
        ok: true,
        source: "provided",
        readResult: null,
        connection: opts.connection
      };
    }

    if (connectionLayer.readConnection && typeof connectionLayer.readConnection === "function") {
      const readResult = await connectionLayer.readConnection();
      const foundConnection = readResult && readResult.data ? readResult.data.connection : null;

      return {
        ok: Boolean(foundConnection),
        source: readResult ? readResult.source : "none",
        readResult,
        connection: foundConnection
      };
    }

    return {
      ok: false,
      source: "none",
      readResult: null,
      connection: null
    };
  }

  async function diagnoseTelegramApi(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const api = telegram.Api || {};
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.API_TEST : "modulos/telegram/api/tl-api-test.js";
    const action = config.action ? config.action.DIAGNOSTIC : "diagnostic";
    const source = "telegram-api";

    const resolved = await resolveConnection(opts);

    if (!resolved.ok || !resolved.connection) {
      return createResult({
        ok: false,
        status: config.status ? config.status.IDLE : "idle",
        action,
        source,
        file,
        message: "No existe conexión Telegram para diagnosticar API.",
        error: {
          message: "No se encontró botToken/chatId en Firebase ni respaldo local.",
          file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
        },
        data: {
          resolved
        }
      });
    }

    const validation = validateConnection(resolved.connection);

    if (!validation.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "La conexión Telegram tiene datos inválidos o incompletos.",
        error: {
          message: validation.errors && validation.errors.length
            ? validation.errors.map(function mapError(item) { return item.message; }).join(" ")
            : validation.message,
          file: config.fileHints ? config.fileHints.API_TEST : "modulos/telegram/api/tl-api-test.js"
        },
        data: {
          resolved,
          validation
        }
      });
    }

    if (!api.getTelegramBotInfo || typeof api.getTelegramBotInfo !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible getTelegramBotInfo. Revisa tl-api-getme.js.",
        error: {
          message: "Falta función getTelegramBotInfo.",
          file: config.fileHints ? config.fileHints.API_GETME : "modulos/telegram/api/tl-api-getme.js"
        },
        data: {
          resolved,
          validation
        }
      });
    }

    const getMeResult = await api.getTelegramBotInfo(resolved.connection.botToken);

    let sendTestResult = null;

    if (opts.sendTestMessage === true) {
      if (api.sendTelegramTestMessage && typeof api.sendTelegramTestMessage === "function") {
        sendTestResult = await api.sendTelegramTestMessage({
          botToken: resolved.connection.botToken,
          chatId: resolved.connection.chatId
        });
      } else {
        sendTestResult = createResult({
          ok: false,
          status: config.status ? config.status.ERROR : "error",
          action,
          source,
          file: config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js",
          message: "No está disponible sendTelegramTestMessage.",
          error: {
            message: "Falta función sendTelegramTestMessage.",
            file: config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js"
          }
        });
      }
    }

    const ok = Boolean(getMeResult && getMeResult.ok && (opts.sendTestMessage === true ? sendTestResult && sendTestResult.ok : true));

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: ok
        ? "Telegram API responde correctamente."
        : "Telegram API tiene un problema con botToken, chatId o envío de mensaje.",
      error: ok ? null : {
        message: sendTestResult && sendTestResult.error && sendTestResult.error.message
          ? sendTestResult.error.message
          : getMeResult && getMeResult.error && getMeResult.error.message
            ? getMeResult.error.message
            : "Falló el diagnóstico Telegram API.",
        file
      },
      data: {
        resolved,
        validation,
        getMeResult,
        sendTestResult,
        sentTestMessage: opts.sendTestMessage === true
      }
    });
  }

  diagnostic.diagnoseTelegramApi = diagnoseTelegramApi;
})(window);
