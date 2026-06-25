/*
  Nombre completo: tl-api-test.js
  Ruta: modulos/telegram/api/tl-api-test.js

  Función:
    - Ejecutar prueba completa de Telegram API.
    - Validar botToken con getMe.
    - Validar chatId enviando un mensaje de prueba.
    - Entregar un resultado único para conexión, diagnóstico y UI.
    - No guardar datos en Firebase ni localStorage.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-validate.js
    - modulos/telegram/api/tl-api-getme.js
    - modulos/telegram/api/tl-api-send.js
    - modulos/telegram/connection/tl-connection-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-telegram.js
*/

(function initTelegramApiTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const api = telegram.Api = telegram.Api || {};

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
        action: data.action || "testTelegram",
        source: data.source || "telegram-api",
        message: data.message || "",
        file: data.file || "modulos/telegram/api/tl-api-test.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function normalizeConnection(connection) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const data = connection && typeof connection === "object" ? connection : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source: config.source ? config.source.MEMORY : "memory"
      });
    }

    return data;
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
      message: errors.length === 0
        ? "Datos mínimos presentes."
        : "Faltan datos para probar Telegram."
    };
  }

  async function testTelegramApi(connection) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.API_TEST : "modulos/telegram/api/tl-api-test.js";
    const action = config.action ? config.action.TEST_TELEGRAM : "testTelegram";
    const source = "telegram-api";
    const checkedAt = new Date().toISOString();
    const normalized = normalizeConnection(connection);
    const validation = validateConnection(normalized);

    const checks = {
      dataValid: Boolean(validation.ok),
      getMeOk: false,
      sendMessageOk: false
    };

    if (!validation.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: validation.message || "La conexión Telegram está incompleta.",
        error: {
          message: validation.errors && validation.errors.length
            ? validation.errors.map(function mapError(item) {
                return item.message;
              }).join(" ")
            : "Datos inválidos para Telegram.",
          file
        },
        data: {
          checks,
          validation,
          connection: normalized
        },
        checkedAt
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
          checks,
          validation,
          connection: normalized
        },
        checkedAt
      });
    }

    const getMeResult = await api.getTelegramBotInfo(normalized.botToken);
    checks.getMeOk = Boolean(getMeResult && getMeResult.ok);

    if (!checks.getMeOk) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "El botToken no pasó la prueba getMe de Telegram.",
        error: getMeResult ? getMeResult.error : null,
        data: {
          checks,
          validation,
          connection: normalized,
          getMeResult
        },
        checkedAt
      });
    }

    if (!api.sendTelegramTestMessage || typeof api.sendTelegramTestMessage !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible sendTelegramTestMessage. Revisa tl-api-send.js.",
        error: {
          message: "Falta función sendTelegramTestMessage.",
          file: config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js"
        },
        data: {
          checks,
          validation,
          connection: normalized,
          getMeResult
        },
        checkedAt
      });
    }

    const sendResult = await api.sendTelegramTestMessage({
      botToken: normalized.botToken,
      chatId: normalized.chatId
    });
    checks.sendMessageOk = Boolean(sendResult && sendResult.ok);

    if (!checks.sendMessageOk) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "El bot fue validado, pero no se pudo enviar el mensaje de prueba.",
        error: sendResult ? sendResult.error : null,
        data: {
          checks,
          validation,
          connection: normalized,
          getMeResult,
          sendResult
        },
        checkedAt
      });
    }

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action,
      source,
      file,
      message: "Telegram API funciona correctamente: bot validado y mensaje enviado.",
      data: {
        checks,
        validation,
        connection: {
          ...normalized,
          telegramConnectionOk: true,
          lastCheckedAt: checkedAt
        },
        getMeResult,
        sendResult
      },
      checkedAt
    });
  }

  api.testTelegramApi = testTelegramApi;
})(window);
