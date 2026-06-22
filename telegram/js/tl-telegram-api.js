/*
  Nombre completo: tl-telegram-api.js
  Ruta: telegram/js/tl-telegram-api.js
  Función:
    - Comunicarse directamente con Telegram Bot API.
    - Validar token con getMe.
    - Enviar mensajes con sendMessage.
  Se conecta con:
    - tl-config.js
    - tl-storage.js
    - tl-event.service.js
    - tl-app.js
*/

(function initTlTelegramApi(global) {
  "use strict";

  const TL = global.TL;
  const API_BASE_URL = TL.CONFIG.TELEGRAM_API_BASE_URL;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function buildMethodUrl(botToken, methodName) {
    const safeToken = normalizeText(botToken);

    if (!safeToken) {
      throw new Error("Falta el Bot Token.");
    }

    return `${API_BASE_URL}/bot${encodeURIComponent(safeToken)}/${methodName}`;
  }

  async function parseTelegramResponse(response) {
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("Telegram no devolvió una respuesta JSON válida.");
    }

    if (!response.ok || !payload.ok) {
      const description = payload && payload.description
        ? payload.description
        : "Telegram rechazó la solicitud.";

      throw new Error(description);
    }

    return payload.result;
  }

  async function getMe(botToken) {
    const url = buildMethodUrl(botToken, "getMe");

    const response = await fetch(url, {
      method: "POST"
    });

    return parseTelegramResponse(response);
  }

  async function sendMessage(params) {
    const botToken = normalizeText(params.botToken);
    const chatId = normalizeText(params.chatId);
    const text = normalizeText(params.text);

    if (!botToken) {
      throw new Error("Falta el Bot Token.");
    }

    if (!chatId) {
      throw new Error("Falta el Chat ID.");
    }

    if (!text) {
      throw new Error("No hay mensaje para enviar.");
    }

    const url = buildMethodUrl(botToken, "sendMessage");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    return parseTelegramResponse(response);
  }

  TL.TelegramApi = {
    getMe,
    sendMessage
  };
})(window);