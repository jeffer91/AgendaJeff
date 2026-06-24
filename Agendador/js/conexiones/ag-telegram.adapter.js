/*
  Nombre completo: ag-telegram.adapter.js
  Ruta: Agendador/js/conexiones/ag-telegram.adapter.js

  Función:
    - Adaptador del Agendador para Telegram.
    - Recibe un evento, pendiente o recordatorio local.
    - Construye mensajes HTML.
    - Envía avisos individuales solo para registros normales o recordatorios.
    - Envía un solo resumen cuando la carga es masiva.
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

  function getElectronBridge() {
    try {
      return global.AgendaJeffElectron || global.parent?.AgendaJeffElectron || global.top?.AgendaJeffElectron || null;
    } catch (_error) {
      return global.AgendaJeffElectron || null;
    }
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
    if (itemType === CONFIG.TYPES.PENDING) return "🟡";
    if (itemType === CONFIG.TYPES.REMINDER) return "🟣";
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

  function createBulkImportSummaryMessage(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const savedItems = Array.isArray(safePayload.savedItems) ? safePayload.savedItems : [];
    const failed = Number(safePayload.failed || 0);
    const total = Number(safePayload.total || savedItems.length || 0);
    const saved = Number(safePayload.saved || savedItems.length || 0);

    const typeCounter = savedItems.reduce((acc, item) => {
      const type = item && item.type ? item.type : "event";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const firstDates = savedItems
      .map((item) => item && item.date ? item.date : "")
      .filter(Boolean)
      .sort();

    const firstDate = firstDates[0] || "sin fecha";
    const lastDate = firstDates[firstDates.length - 1] || firstDate;

    const lines = [
      "<b>✅ Carga masiva agregada a AgendaJeff</b>",
      "",
      `<b>Lote:</b> ${escapeHtml(batch.name || batch.id || "Carga masiva")}`,
      `<b>Agregados:</b> ${saved} de ${total}`,
      failed ? `<b>No agregados:</b> ${failed}` : "",
      `<b>Rango:</b> ${escapeHtml(firstDate)}${lastDate !== firstDate ? ` a ${escapeHtml(lastDate)}` : ""}`,
      "",
      `<b>Eventos:</b> ${typeCounter.event || 0}`,
      typeCounter.pending ? `<b>Pendientes:</b> ${typeCounter.pending}` : "",
      typeCounter.reminder ? `<b>Recordatorios:</b> ${typeCounter.reminder}` : "",
      "",
      "<i>Los avisos individuales se enviarán cuando se acerque cada fecha o recordatorio.</i>"
    ];

    return lines.filter(Boolean).join("\n");
  }

  async function sendTelegramText(text) {
    if (isTelegramModuleAvailable()) {
      const connection = readTelegramConnection();

      if (!hasValidConnection(connection)) {
        return {
          ok: false,
          status: "notConfigured",
          message: "Telegram no tiene Bot Token y Chat ID guardados."
        };
      }

      const telegramResult = await global.TL.TelegramApi.sendMessage({
        botToken: connection.botToken,
        chatId: connection.chatId,
        text
      });

      return {
        ok: true,
        status: "sent",
        message: "Mensaje enviado por Telegram.",
        data: {
          chatId: connection.chatId,
          telegramMessageId: telegramResult && telegramResult.message_id ? telegramResult.message_id : null,
          telegram: telegramResult
        }
      };
    }

    const bridge = getElectronBridge();

    if (bridge && bridge.telegram && typeof bridge.telegram.send === "function") {
      return bridge.telegram.send({ text, parseMode: "HTML" });
    }

    return {
      ok: false,
      status: "missingAdapterDependency",
      message: "Telegram no está cargado y Electron no expone envío de Telegram."
    };
  }

  async function syncItem(item) {
    if (!Array.isArray(item.channels) || !item.channels.includes(CONFIG.CONNECTIONS.TELEGRAM)) {
      return {
        ok: true,
        status: "skipped",
        message: "Telegram no está seleccionado para este registro."
      };
    }

    if (item && item.cm && item.cm.suppressIndividualTelegram === true) {
      return {
        ok: true,
        status: "skippedBulk",
        message: "Telegram individual omitido porque este registro pertenece a una carga masiva."
      };
    }

    const result = await sendTelegramText(createTelegramMessage(item));

    if (!result.ok) {
      return result;
    }

    return {
      ...result,
      message: "Aviso enviado por Telegram."
    };
  }

  async function syncBulkImportSummary(payload) {
    const safePayload = payload || {};
    const savedItems = Array.isArray(safePayload.savedItems) ? safePayload.savedItems : [];
    const shouldSend = savedItems.some((item) => {
      return Array.isArray(item.channels) && item.channels.includes(CONFIG.CONNECTIONS.TELEGRAM);
    });

    if (!shouldSend) {
      return {
        ok: true,
        skipped: true,
        status: "skipped",
        message: "Telegram no está seleccionado para este lote."
      };
    }

    const result = await sendTelegramText(createBulkImportSummaryMessage(safePayload));

    if (!result.ok) {
      return result;
    }

    return {
      ...result,
      status: "bulkSummarySent",
      message: `Resumen enviado por Telegram: ${savedItems.length} eventos agregados.`
    };
  }

  async function testAvailability() {
    if (!isTelegramModuleAvailable()) {
      const bridge = getElectronBridge();

      if (bridge && bridge.telegram && typeof bridge.telegram.send === "function") {
        return {
          ok: true,
          status: "readyViaElectron",
          message: "Telegram está disponible mediante Electron."
        };
      }

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
    createBulkImportSummaryMessage,
    sendTelegramText,
    syncItem,
    syncBulkImportSummary,
    testAvailability
  };
})(window);
