/*
  Nombre completo: tl-api-send.js
  Ruta: modulos/telegram/api/tl-api-send.js

  Función:
    - Enviar mensajes usando Telegram Bot API.
    - Validar botToken, chatId y texto antes del envío.
    - Enviar mensajes reales y mensajes de prueba.
    - No guardar datos en Firebase ni localStorage.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-validate.js
    - modulos/telegram/api/tl-api-url.js
    - modulos/telegram/api/tl-api-test.js
    - modulos/telegram/connection/tl-connection-test.js
    - modulos/telegram/connector/tl-connector-send.js
    - modulos/telegram/diagnostic/tl-diagnostic-telegram.js
*/

(function initTelegramApiSend(global) {
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
        action: data.action || "sendMessage",
        source: data.source || "telegram-api",
        message: data.message || "",
        file: data.file || "modulos/telegram/api/tl-api-send.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function asText(value) {
    const utils = getUtils();

    if (utils.Normalize && typeof utils.Normalize.asText === "function") {
      return utils.Normalize.asText(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function validateBotToken(botToken) {
    const utils = getUtils();

    if (utils.Validate && typeof utils.Validate.validateBotToken === "function") {
      return utils.Validate.validateBotToken(botToken);
    }

    const value = asText(botToken).replace(/\s+/g, "");

    return {
      ok: value.length > 0,
      value,
      message: value.length > 0 ? "Bot Token presente." : "Falta el Bot Token de Telegram."
    };
  }

  function validateChatId(chatId) {
    const utils = getUtils();

    if (utils.Validate && typeof utils.Validate.validateChatId === "function") {
      return utils.Validate.validateChatId(chatId);
    }

    const value = asText(chatId).replace(/\s+/g, "");

    return {
      ok: value.length > 0,
      value,
      message: value.length > 0 ? "Chat ID presente." : "Falta el Chat ID de Telegram."
    };
  }

  function validateMessageText(text) {
    const value = asText(text);

    if (!value) {
      return {
        ok: false,
        value,
        message: "Falta el texto del mensaje de Telegram."
      };
    }

    if (value.length > 4096) {
      return {
        ok: false,
        value,
        message: "El mensaje supera el límite de 4096 caracteres de Telegram."
      };
    }

    return {
      ok: true,
      value,
      message: "Texto válido."
    };
  }

  function createAbortController(timeoutMs) {
    if (typeof global.AbortController !== "function") {
      return {
        controller: null,
        timeoutId: null
      };
    }

    const controller = new global.AbortController();
    const timeoutId = global.setTimeout(function abortRequest() {
      controller.abort();
    }, timeoutMs);

    return {
      controller,
      timeoutId
    };
  }

  async function readJsonResponse(response) {
    try {
      return await response.json();
    } catch (error) {
      return {
        ok: false,
        description: "Telegram respondió, pero no se pudo interpretar el JSON.",
        parseError: error && error.message ? error.message : "JSON inválido."
      };
    }
  }

  function buildCredentials(input) {
    const data = input && typeof input === "object" ? input : {};

    return {
      botToken: data.botToken || "",
      chatId: data.chatId || ""
    };
  }

  async function sendTelegramMessage(credentials, text, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js";
    const action = config.action ? config.action.SEND_MESSAGE : "sendMessage";
    const source = "telegram-api";
    const checkedAt = new Date().toISOString();
    const creds = buildCredentials(credentials);
    const opts = options && typeof options === "object" ? options : {};

    const tokenCheck = validateBotToken(creds.botToken);
    const chatCheck = validateChatId(creds.chatId);
    const textCheck = validateMessageText(text);
    const validationErrors = [tokenCheck, chatCheck, textCheck].filter(function filterInvalid(check) {
      return !check.ok;
    });

    if (validationErrors.length > 0) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se puede enviar el mensaje porque faltan datos o hay datos inválidos.",
        error: {
          message: validationErrors.map(function mapError(item) {
            return item.message;
          }).join(" "),
          file
        },
        data: {
          checks: {
            botToken: tokenCheck,
            chatId: chatCheck,
            text: textCheck
          }
        },
        checkedAt
      });
    }

    if (!api.Url || typeof api.Url.sendMessageUrl !== "function" || typeof api.Url.buildSendMessagePayload !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No están disponibles las utilidades de URL de Telegram. Revisa tl-api-url.js.",
        error: {
          message: "Falta api.Url.sendMessageUrl o api.Url.buildSendMessagePayload.",
          file: config.fileHints ? config.fileHints.API_URL : "modulos/telegram/api/tl-api-url.js"
        },
        checkedAt
      });
    }

    const url = api.Url.sendMessageUrl(tokenCheck.value);
    const payload = api.Url.buildSendMessagePayload({
      chatId: chatCheck.value,
      text: textCheck.value,
      parseMode: opts.parseMode,
      disableWebPagePreview: opts.disableWebPagePreview,
      disableNotification: opts.disableNotification
    });
    const timeoutMs = typeof api.Url.getRequestTimeoutMs === "function"
      ? api.Url.getRequestTimeoutMs()
      : 15000;
    const abort = createAbortController(timeoutMs);

    try {
      const response = await global.fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: abort.controller ? abort.controller.signal : undefined
      });

      if (abort.timeoutId) {
        global.clearTimeout(abort.timeoutId);
      }

      const json = await readJsonResponse(response);

      if (!response.ok || !json.ok) {
        const description = json.description || `Telegram respondió con estado HTTP ${response.status}.`;

        return createResult({
          ok: false,
          status: config.status ? config.status.ERROR : "error",
          action,
          source,
          file,
          message: "Telegram no pudo enviar el mensaje.",
          error: {
            message: description,
            file
          },
          data: {
            httpStatus: response.status,
            telegramResponse: json,
            payload: {
              ...payload,
              text: textCheck.value
            },
            checks: {
              botToken: tokenCheck,
              chatId: chatCheck,
              text: textCheck
            }
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
        message: "Mensaje enviado correctamente por Telegram.",
        data: {
          httpStatus: response.status,
          telegramResponse: json,
          sentMessage: json.result || null,
          checks: {
            botToken: tokenCheck,
            chatId: chatCheck,
            text: textCheck
          }
        },
        checkedAt
      });
    } catch (error) {
      if (abort.timeoutId) {
        global.clearTimeout(abort.timeoutId);
      }

      const isAbort = error && error.name === "AbortError";

      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: isAbort
          ? "El envío del mensaje tardó demasiado y fue cancelado."
          : "No se pudo enviar el mensaje con Telegram API.",
        error: {
          message: isAbort
            ? `Tiempo máximo superado: ${timeoutMs} ms.`
            : (error && error.message ? error.message : "Error desconocido enviando mensaje."),
          file
        },
        data: {
          timeoutMs,
          checks: {
            botToken: tokenCheck,
            chatId: chatCheck,
            text: textCheck
          }
        },
        checkedAt
      });
    }
  }

  async function sendTelegramTestMessage(credentials) {
    const config = getConfig();
    const now = new Date().toISOString();
    const message = [
      "✅ <b>AgendaJeff</b>",
      "Prueba de conexión Telegram realizada correctamente.",
      `Fecha: ${now}`
    ].join("\n");

    const result = await sendTelegramMessage(credentials, message, {
      parseMode: config.telegramApi ? config.telegramApi.defaultParseMode : "HTML",
      disableWebPagePreview: true,
      disableNotification: false
    });

    if (result && result.data) {
      result.action = config.action ? config.action.SEND_TEST_MESSAGE : "sendTestMessage";
    }

    return result;
  }

  api.sendTelegramMessage = sendTelegramMessage;
  api.sendTelegramTestMessage = sendTelegramTestMessage;
})(window);
