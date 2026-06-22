/*
  Nombre completo: ag-telegram.adapter.js
  Ruta: Agendador/js/conexiones/ag-telegram.adapter.js

  Función:
    - Adaptador del Agendador para Telegram.
    - Recibe un evento, pendiente o recordatorio local.
    - Construye un mensaje HTML.
    - Usa el módulo Telegram existente si está cargado.
    - Envía mensaje al chat configurado.
    - No depende del HTML de tl-index.html.
    - No presiona botones de Telegram.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../servicios/ag-reminder.service.js
    - ../../telegram/js/tl-config.js
    - ../../telegram/js/tl-storage.js
    - ../../telegram/js/tl-telegram-api.js
*/

(function initAgTelegramAdapter(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isTelegramModuleAvailable() {
    return Boolean(
      global.TL &&
      global.TL.Storage &&
      global.TL.TelegramApi &&
      typeof global.TL.TelegramApi.sendMessage === "function"
    );
  }

  function readTelegramConnection() {
    if (!isTelegramModuleAvailable()) {
      return null;
    }

    if (typeof global.TL.Storage.readConnection !== "function") {
      return null;
    }

    return global.TL.Storage.readConnection();
  }

  function hasValidConnection(connection) {
    return Boolean(
      connection &&
      normalizeText(connection.botToken) &&
      normalizeText(connection.chatId)
    );
  }

  function getTypeIcon(itemType) {
    if (itemType === CONFIG.TYPES.PENDING) {
      return "🟡";
    }

    if (itemType === CONFIG.TYPES.REMINDER) {
      return "🟣";
    }

    return "🔵";
  }

  function getTypeLabel(itemType) {
    return CONFIG.TYPE_LABELS[itemType] || "Registro";
  }

  function getPriorityLabel(priority) {
    return CONFIG.PRIORITY_LABELS[priority] || "Normal";
  }

  function createReminderText(item) {
    if (!AG.ReminderService || typeof AG.ReminderService.buildReminderSchedule !== "function") {
      return "";
    }

    const reminders = AG.ReminderService.buildReminderSchedule(item);

    if (!reminders.length) {
      return "";
    }

    return reminders.map((reminder) => reminder.label).join(", ");
  }

  function createTelegramMessage(item) {
    const safeItem = item || {};
    const responsible = safeItem.responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const typeLabel = getTypeLabel(safeItem.type);
    const priorityLabel = getPriorityLabel(safeItem.priority);
    const reminders = createReminderText(safeItem);

    const lines = [
      `<b>${escapeHtml(getTypeIcon(safeItem.type))} ${escapeHtml(typeLabel)} - AgendaJeff</b>`,
      "",
      `<b>Título:</b> ${escapeHtml(safeItem.title || "Sin título")}`,
      `<b>Fecha:</b> ${escapeHtml(safeItem.date || "Sin fecha")}`,
      safeItem.time ? `<b>Hora:</b> ${escapeHtml(safeItem.time)}` : "",
      `<b>Prioridad:</b> ${escapeHtml(priorityLabel)}`,
      `<b>Responsable:</b> ${escapeHtml(responsible.name || "Yo")}`,
      reminders ? `<b>Recordatorios:</b> ${escapeHtml(reminders)}` : "",
      safeItem.description ? `<b>Detalle:</b> ${escapeHtml(safeItem.description)}` : "",
      "",
      `<i>Creado desde el Agendador de AgendaJeff.</i>`,
      `<code>${escapeHtml(safeItem.id || "")}</code>`
    ];

    return lines.filter(Boolean).join("\n");
  }

  async function syncItem(item) {
    if (!Array.isArray(item.channels) || !item.channels.includes(CONFIG.CONNECTIONS.TELEGRAM)) {
      return {
        ok: true,
        status: "skipped",
        message: "Telegram no está seleccionado para este registro."
      };
    }

    if (!isTelegramModuleAvailable()) {
      return {
        ok: false,
        status: "missingAdapterDependency",
        message: "El módulo Telegram no está cargado en esta pantalla."
      };
    }

    const connection = readTelegramConnection();

    if (!hasValidConnection(connection)) {
      return {
        ok: false,
        status: "notConfigured",
        message: "Telegram no tiene Bot Token y Chat ID guardados."
      };
    }

    const message = createTelegramMessage(item);

    const telegramResult = await global.TL.TelegramApi.sendMessage({
      botToken: connection.botToken,
      chatId: connection.chatId,
      text: message
    });

    return {
      ok: true,
      status: "sent",
      message: "Aviso enviado por Telegram.",
      data: {
        chatId: connection.chatId,
        telegramMessageId: telegramResult && telegramResult.message_id
          ? telegramResult.message_id
          : null,
        telegram: telegramResult
      }
    };
  }

  async function testAvailability() {
    if (!isTelegramModuleAvailable()) {
      return {
        ok: false,
        status: "missing",
        message: "Telegram no está cargado."
      };
    }

    const connection = readTelegramConnection();

    if (!hasValidConnection(connection)) {
      return {
        ok: false,
        status: "notConfigured",
        message: "Telegram no está configurado."
      };
    }

    return {
      ok: true,
      status: "ready",
      message: "Telegram está listo para enviar avisos.",
      data: {
        chatId: connection.chatId,
        savedAt: connection.savedAt || ""
      }
    };
  }

  AG.Adapters.TelegramAdapter = {
    isTelegramModuleAvailable,
    readTelegramConnection,
    createTelegramMessage,
    syncItem,
    testAvailability
  };
})(window);