/*
  Nombre completo: bg-telegram.service.js
  Ruta: electron/background/bg-telegram.service.js

  Función:
    - Enviar mensajes de Telegram desde el proceso principal de Electron.
    - Usar la configuración sincronizada por telegram/js/tl-storage.js.
    - Funcionar aunque la ventana esté oculta.
*/

"use strict";

const https = require("https");

function createBackgroundTelegramService(storeService) {
  if (!storeService || typeof storeService.readTelegramConfig !== "function") {
    throw new Error("bg-telegram.service.js requiere bg-store.service.js.");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return normalizeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function maskToken(token) {
    const safeToken = normalizeText(token);
    if (!safeToken) return "";
    if (safeToken.length <= 10) return "********";
    return `${safeToken.slice(0, 6)}...${safeToken.slice(-4)}`;
  }

  function readConnection() {
    const config = storeService.readTelegramConfig();
    return {
      enabled: Boolean(config.enabled),
      configured: Boolean(config.configured),
      botToken: normalizeText(config.botToken),
      chatId: normalizeText(config.chatId),
      username: normalizeText(config.username),
      updatedAt: normalizeText(config.updatedAt)
    };
  }

  function hasValidConnection() {
    const connection = readConnection();
    return Boolean(connection.botToken && connection.chatId);
  }

  function buildUrl(method, botToken) {
    const token = normalizeText(botToken);
    if (!token) {
      throw new Error("No existe Bot Token de Telegram para segundo plano.");
    }
    return new URL(`https://api.telegram.org/bot${token}/${method}`);
  }

  function postJson(url, payload) {
    const body = JSON.stringify(payload || {});

    return new Promise((resolve, reject) => {
      const request = https.request(
        {
          method: "POST",
          hostname: url.hostname,
          path: `${url.pathname}${url.search}`,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
          },
          timeout: 15000
        },
        (response) => {
          let raw = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => { raw += chunk; });
          response.on("end", () => {
            let parsed = {};
            try {
              parsed = raw ? JSON.parse(raw) : {};
            } catch (error) {
              reject(new Error(`Telegram respondió con JSON inválido: ${error.message}`));
              return;
            }

            if (!parsed.ok) {
              reject(new Error(parsed.description || "Telegram rechazó la solicitud."));
              return;
            }

            resolve(parsed.result || parsed);
          });
        }
      );

      request.on("timeout", () => {
        request.destroy(new Error("Telegram tardó demasiado en responder."));
      });
      request.on("error", reject);
      request.write(body);
      request.end();
    });
  }

  async function getMe() {
    const connection = readConnection();
    if (!connection.botToken) {
      throw new Error("No hay Bot Token guardado para Telegram.");
    }
    const result = await postJson(buildUrl("getMe", connection.botToken), {});
    return { ok: true, bot: result, checkedAt: nowIso() };
  }

  function createReminderMessage(reminder) {
    const item = reminder && typeof reminder === "object" ? reminder : {};
    const title = escapeHtml(item.title || item.itemTitle || "Recordatorio AgendaJeff");
    const body = escapeHtml(item.body || item.description || item.message || "Tienes un recordatorio pendiente.");
    const eventLocal = escapeHtml(item.eventLocal || item.eventAt || item.date || "");
    const reminderLocal = escapeHtml(item.triggerLocal || item.reminderLocal || item.reminderAt || item.triggerAt || "");

    return [
      `<b>🔔 ${title}</b>`,
      "",
      body,
      eventLocal ? `<b>Evento:</b> ${eventLocal}` : "",
      reminderLocal ? `<b>Aviso:</b> ${reminderLocal}` : "",
      item.label ? `<b>Tipo:</b> ${escapeHtml(item.label)}` : "",
      "",
      "<i>Enviado por AgendaJeff en segundo plano.</i>"
    ].filter(Boolean).join("\n");
  }

  async function sendMessage(params) {
    const item = params && typeof params === "object" ? params : {};
    const connection = readConnection();

    if (!connection.botToken || !connection.chatId) {
      throw new Error("Telegram no está configurado para segundo plano. Guarda Bot Token y Chat ID.");
    }

    const payload = {
      chat_id: normalizeText(item.chatId || connection.chatId),
      text: normalizeText(item.text || item.message || ""),
      parse_mode: item.parseMode || "HTML",
      disable_web_page_preview: true
    };

    if (!payload.text) {
      throw new Error("No se puede enviar un mensaje vacío por Telegram.");
    }

    const result = await postJson(buildUrl("sendMessage", connection.botToken), payload);
    return {
      ok: true,
      mode: "electron-background",
      chatId: payload.chat_id,
      messageId: result.message_id || "",
      sentAt: nowIso()
    };
  }

  async function sendReminder(reminder) {
    return sendMessage({ text: createReminderMessage(reminder), parseMode: "HTML" });
  }

  async function testMessage() {
    return sendMessage({
      text: [
        "<b>AgendaJeff - Telegram</b>",
        "",
        "La conexión de Telegram en segundo plano está funcionando.",
        "",
        `<i>${escapeHtml(nowIso())}</i>`
      ].join("\n")
    });
  }

  function getSafeStatus() {
    const connection = readConnection();
    return {
      ok: true,
      enabled: connection.enabled,
      configured: hasValidConnection(),
      hasBotToken: Boolean(connection.botToken),
      botTokenMasked: maskToken(connection.botToken),
      hasChatId: Boolean(connection.chatId),
      chatId: connection.chatId ? "guardado" : "",
      username: connection.username,
      updatedAt: connection.updatedAt,
      checkedAt: nowIso()
    };
  }

  return {
    readConnection,
    hasValidConnection,
    getSafeStatus,
    getMe,
    sendMessage,
    sendReminder,
    testMessage,
    createReminderMessage
  };
}

module.exports = createBackgroundTelegramService;
