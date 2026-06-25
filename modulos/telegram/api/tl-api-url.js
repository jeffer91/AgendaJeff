/*
  Nombre completo: tl-api-url.js
  Ruta: modulos/telegram/api/tl-api-url.js

  Función:
    - Construir URLs seguras para Telegram Bot API.
    - Centralizar nombres de métodos getMe y sendMessage.
    - Evitar que otros archivos armen URLs manualmente.
    - No hacer llamadas fetch; este archivo solo prepara rutas y payloads.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/utils/tl-validate.js
    - modulos/telegram/api/tl-api-getme.js
    - modulos/telegram/api/tl-api-send.js
    - modulos/telegram/api/tl-api-test.js
*/

(function initTelegramApiUrl(global) {
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

  function normalizeBotToken(botToken) {
    const utils = getUtils();

    if (utils.Normalize && typeof utils.Normalize.normalizeBotToken === "function") {
      return utils.Normalize.normalizeBotToken(botToken);
    }

    return asText(botToken).replace(/\s+/g, "");
  }

  function normalizeChatId(chatId) {
    const utils = getUtils();

    if (utils.Normalize && typeof utils.Normalize.normalizeChatId === "function") {
      return utils.Normalize.normalizeChatId(chatId);
    }

    return asText(chatId).replace(/\s+/g, "");
  }

  function getTelegramApiConfig() {
    const config = getConfig();
    const telegramApi = config.telegramApi || {};

    return {
      baseUrl: telegramApi.baseUrl || "https://api.telegram.org",
      getMeMethod: telegramApi.getMeMethod || "getMe",
      sendMessageMethod: telegramApi.sendMessageMethod || "sendMessage",
      defaultParseMode: telegramApi.defaultParseMode || "HTML",
      requestTimeoutMs: Number.isFinite(telegramApi.requestTimeoutMs)
        ? telegramApi.requestTimeoutMs
        : 15000
    };
  }

  function trimBaseUrl(baseUrl) {
    return asText(baseUrl).replace(/\/+$/g, "");
  }

  function getMethodUrl(botToken, methodName) {
    const apiConfig = getTelegramApiConfig();
    const token = normalizeBotToken(botToken);
    const method = asText(methodName);
    const baseUrl = trimBaseUrl(apiConfig.baseUrl);

    if (!token) {
      return "";
    }

    if (!method) {
      return "";
    }

    return `${baseUrl}/bot${token}/${method}`;
  }

  function getMeUrl(botToken) {
    const apiConfig = getTelegramApiConfig();

    return getMethodUrl(botToken, apiConfig.getMeMethod);
  }

  function sendMessageUrl(botToken) {
    const apiConfig = getTelegramApiConfig();

    return getMethodUrl(botToken, apiConfig.sendMessageMethod);
  }

  function buildSendMessagePayload(input) {
    const apiConfig = getTelegramApiConfig();
    const data = input && typeof input === "object" ? input : {};
    const chatId = normalizeChatId(data.chatId);
    const text = asText(data.text || data.message);
    const parseMode = asText(data.parseMode) || apiConfig.defaultParseMode;

    const payload = {
      chat_id: chatId,
      text
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (typeof data.disableWebPagePreview === "boolean") {
      payload.disable_web_page_preview = data.disableWebPagePreview;
    }

    if (typeof data.disableNotification === "boolean") {
      payload.disable_notification = data.disableNotification;
    }

    return payload;
  }

  function getRequestTimeoutMs() {
    return getTelegramApiConfig().requestTimeoutMs;
  }

  api.Url = Object.freeze({
    getTelegramApiConfig,
    normalizeBotToken,
    normalizeChatId,
    getMethodUrl,
    getMeUrl,
    sendMessageUrl,
    buildSendMessagePayload,
    getRequestTimeoutMs
  });
})(window);
