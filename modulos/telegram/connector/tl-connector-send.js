/*
  Nombre completo: tl-connector-send.js
  Ruta: modulos/telegram/connector/tl-connector-send.js

  Función:
    - Exponer envío de mensajes Telegram para otros módulos de AgendaJeff.
    - Permitir enviar mensajes sin que otros módulos conozcan Firebase, localStorage ni Telegram API.
    - Leer la conexión disponible y delegar el envío a tl-api-send.js.
    - Mantener una puerta pública estable en window.AgendaJeffTelegram.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/connector/tl-connector-status.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/api/tl-api-send.js
    - modulos/telegram/diagnostic/tl-diagnostic-telegram.js
*/

(function initTelegramConnectorSend(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const connector = telegram.Connector = telegram.Connector || {};
  const publicConnector = global.AgendaJeffTelegram = global.AgendaJeffTelegram || {};

  let lastSendResult = null;

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
        action: data.action || "sendMessage",
        source: data.source || "connector",
        message: data.message || "",
        file: data.file || "modulos/telegram/connector/tl-connector-send.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function asText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function normalizeSendInput(input, options) {
    const opts = options && typeof options === "object" ? options : {};

    if (typeof input === "string") {
      return {
        text: input,
        parseMode: opts.parseMode,
        disableWebPagePreview: opts.disableWebPagePreview,
        disableNotification: opts.disableNotification,
        connection: opts.connection || null,
        preferLocal: opts.preferLocal === true
      };
    }

    const data = input && typeof input === "object" ? input : {};

    return {
      text: asText(data.text || data.message || opts.text || opts.message),
      parseMode: data.parseMode || opts.parseMode,
      disableWebPagePreview: typeof data.disableWebPagePreview === "boolean"
        ? data.disableWebPagePreview
        : opts.disableWebPagePreview,
      disableNotification: typeof data.disableNotification === "boolean"
        ? data.disableNotification
        : opts.disableNotification,
      connection: data.connection || opts.connection || null,
      preferLocal: data.preferLocal === true || opts.preferLocal === true
    };
  }

  function getConnectionFromReadResult(readResult) {
    if (!readResult || !readResult.data) {
      return null;
    }

    return readResult.data.connection || null;
  }

  async function resolveConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";

    if (opts.connection && typeof opts.connection === "object") {
      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: "sendMessage",
        source: "connector",
        file,
        message: "Conexión recibida directamente para envío Telegram.",
        data: {
          connection: opts.connection,
          readResult: null
        }
      });
    }

    if (connector.readConnectionSafely && typeof connector.readConnectionSafely === "function") {
      const connectorRead = await connector.readConnectionSafely({
        preferLocal: opts.preferLocal === true
      });

      return createResult({
        ok: Boolean(connectorRead && connectorRead.data && connectorRead.data.connection),
        status: connectorRead ? connectorRead.status : (config.status ? config.status.ERROR : "error"),
        action: "sendMessage",
        source: "connector",
        file,
        message: connectorRead && connectorRead.data && connectorRead.data.connection
          ? "Conexión obtenida por el conector."
          : "No se pudo obtener conexión por el conector.",
        error: connectorRead ? connectorRead.error : null,
        data: {
          connection: connectorRead && connectorRead.data ? connectorRead.data.connection : null,
          readResult: connectorRead
        }
      });
    }

    const connectionLayer = telegram.Connection || {};

    if (connectionLayer.readConnection && typeof connectionLayer.readConnection === "function") {
      const readResult = await connectionLayer.readConnection({
        preferLocal: opts.preferLocal === true
      });

      return createResult({
        ok: Boolean(readResult && readResult.data && readResult.data.connection),
        status: readResult ? readResult.status : (config.status ? config.status.ERROR : "error"),
        action: "sendMessage",
        source: "connector",
        file,
        message: readResult && readResult.data && readResult.data.connection
          ? "Conexión obtenida desde capa connection."
          : "No se pudo obtener conexión desde capa connection.",
        error: readResult ? readResult.error : null,
        data: {
          connection: getConnectionFromReadResult(readResult),
          readResult
        }
      });
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.ERROR : "error",
      action: "sendMessage",
      source: "connector",
      file,
      message: "No existe una función para leer la conexión Telegram.",
      error: {
        message: "Falta readConnectionSafely o readConnection.",
        file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
      }
    });
  }

  async function sendMessage(input, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const api = telegram.Api || {};
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const normalized = normalizeSendInput(input, options);
    const action = config.action ? config.action.SEND_MESSAGE : "sendMessage";

    if (!normalized.text) {
      lastSendResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No se envió Telegram porque el texto está vacío.",
        error: {
          message: "Falta texto del mensaje.",
          file
        }
      });

      return lastSendResult;
    }

    if (!api.sendTelegramMessage || typeof api.sendTelegramMessage !== "function") {
      lastSendResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No está disponible sendTelegramMessage. Revisa tl-api-send.js.",
        error: {
          message: "Falta función sendTelegramMessage.",
          file: config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js"
        }
      });

      return lastSendResult;
    }

    const resolved = await resolveConnection({
      connection: normalized.connection,
      preferLocal: normalized.preferLocal
    });

    if (!resolved.ok || !resolved.data || !resolved.data.connection) {
      lastSendResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No se pudo enviar Telegram porque no hay conexión disponible.",
        error: resolved.error || {
          message: "No hay botToken/chatId disponibles.",
          file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
        },
        data: {
          resolved
        }
      });

      return lastSendResult;
    }

    const sendResult = await api.sendTelegramMessage(
      {
        botToken: resolved.data.connection.botToken,
        chatId: resolved.data.connection.chatId
      },
      normalized.text,
      {
        parseMode: normalized.parseMode,
        disableWebPagePreview: normalized.disableWebPagePreview,
        disableNotification: normalized.disableNotification
      }
    );

    lastSendResult = createResult({
      ok: Boolean(sendResult && sendResult.ok),
      status: sendResult ? sendResult.status : (config.status ? config.status.ERROR : "error"),
      action,
      source: "connector",
      file,
      message: sendResult && sendResult.ok
        ? "Mensaje enviado por Telegram desde el conector."
        : "Falló el envío Telegram desde el conector.",
      error: sendResult && sendResult.ok ? null : sendResult ? sendResult.error : null,
      data: {
        resolved,
        sendResult
      }
    });

    return lastSendResult;
  }

  async function sendTestMessage(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const api = telegram.Api || {};
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const action = config.action ? config.action.SEND_TEST_MESSAGE : "sendTestMessage";

    if (!api.sendTelegramTestMessage || typeof api.sendTelegramTestMessage !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No está disponible sendTelegramTestMessage. Revisa tl-api-send.js.",
        error: {
          message: "Falta función sendTelegramTestMessage.",
          file: config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js"
        }
      });
    }

    const resolved = await resolveConnection({
      connection: opts.connection,
      preferLocal: opts.preferLocal === true
    });

    if (!resolved.ok || !resolved.data || !resolved.data.connection) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No se pudo enviar mensaje de prueba porque no hay conexión Telegram.",
        error: resolved.error,
        data: {
          resolved
        }
      });
    }

    return api.sendTelegramTestMessage({
      botToken: resolved.data.connection.botToken,
      chatId: resolved.data.connection.chatId
    });
  }

  function getLastSendResult() {
    return lastSendResult;
  }

  connector.sendMessage = sendMessage;
  connector.sendTestMessage = sendTestMessage;
  connector.getLastSendResult = getLastSendResult;

  publicConnector.sendMessage = sendMessage;
  publicConnector.sendTestMessage = sendTestMessage;
  publicConnector.getLastSendResult = getLastSendResult;
})(window);
