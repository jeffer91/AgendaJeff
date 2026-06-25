/*
  Nombre completo: tl-api-getme.js
  Ruta: modulos/telegram/api/tl-api-getme.js

  Función:
    - Validar el bot de Telegram usando el método getMe.
    - Confirmar que el botToken corresponde a un bot real.
    - Entregar respuesta estándar con información básica del bot.
    - No guardar datos en Firebase ni localStorage.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-validate.js
    - modulos/telegram/api/tl-api-url.js
    - modulos/telegram/api/tl-api-test.js
    - modulos/telegram/connection/tl-connection-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-telegram.js
*/

(function initTelegramApiGetMe(global) {
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
        file: data.file || "modulos/telegram/api/tl-api-getme.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function validateBotToken(botToken) {
    const utils = getUtils();

    if (utils.Validate && typeof utils.Validate.validateBotToken === "function") {
      return utils.Validate.validateBotToken(botToken);
    }

    const value = botToken ? String(botToken).trim() : "";

    return {
      ok: value.length > 0,
      value,
      message: value.length > 0 ? "Bot Token presente." : "Falta el Bot Token de Telegram."
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

  async function getTelegramBotInfo(botToken) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.API_GETME : "modulos/telegram/api/tl-api-getme.js";
    const action = config.action ? config.action.TEST_TELEGRAM : "testTelegram";
    const source = "telegram-api";
    const checkedAt = new Date().toISOString();

    const tokenCheck = validateBotToken(botToken);

    if (!tokenCheck.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: tokenCheck.message,
        error: {
          message: tokenCheck.message,
          file: tokenCheck.file || file
        },
        data: {
          tokenCheck
        },
        checkedAt
      });
    }

    if (!api.Url || typeof api.Url.getMeUrl !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible api.Url.getMeUrl. Revisa tl-api-url.js.",
        error: {
          message: "Falta constructor de URL Telegram.",
          file: config.fileHints ? config.fileHints.API_URL : "modulos/telegram/api/tl-api-url.js"
        },
        checkedAt
      });
    }

    const url = api.Url.getMeUrl(tokenCheck.value);
    const timeoutMs = typeof api.Url.getRequestTimeoutMs === "function"
      ? api.Url.getRequestTimeoutMs()
      : 15000;
    const abort = createAbortController(timeoutMs);

    try {
      const response = await global.fetch(url, {
        method: "GET",
        cache: "no-store",
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
          message: "Telegram no aceptó el Bot Token.",
          error: {
            message: description,
            file
          },
          data: {
            httpStatus: response.status,
            telegramResponse: json,
            tokenCheck
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
        message: "Bot de Telegram validado correctamente con getMe.",
        data: {
          httpStatus: response.status,
          bot: json.result || null,
          telegramResponse: json,
          tokenCheck
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
          ? "La validación del bot tardó demasiado y fue cancelada."
          : "No se pudo validar el bot con Telegram API.",
        error: {
          message: isAbort
            ? `Tiempo máximo superado: ${timeoutMs} ms.`
            : (error && error.message ? error.message : "Error desconocido llamando getMe."),
          file
        },
        data: {
          tokenCheck,
          timeoutMs
        },
        checkedAt
      });
    }
  }

  api.getTelegramBotInfo = getTelegramBotInfo;
})(window);
