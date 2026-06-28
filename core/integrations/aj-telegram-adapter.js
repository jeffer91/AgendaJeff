/*
  Nombre completo: aj-telegram-adapter.js
  Ruta: core/integrations/aj-telegram-adapter.js

  Función:
    - Adaptar registros AgendaJeff a mensajes Telegram.
    - Usar el conector existente window.AgendaJeffTelegram sin modificar el módulo Telegram.
*/

(function initAgendaJeffTelegramAdapter(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const integrations = core.Integrations = core.Integrations || {};

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "pending"),
      action: data.action || "telegramAdapter",
      source: "agenda-telegram-adapter",
      message: data.message || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: new Date().toISOString()
    };
  }

  function asText(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function labelAction(action) {
    return {
      create: "Registro creado",
      update: "Registro actualizado",
      complete: "Registro completado",
      reminder: "Recordatorio"
    }[action] || "AgendaJeff";
  }

  function formatItemMessage(item, action) {
    const data = item && typeof item === "object" ? item : {};
    const hora = data.todoDia || !data.horaInicio ? "Sin hora" : data.horaFin ? `${data.horaInicio} - ${data.horaFin}` : data.horaInicio;
    const lines = [
      `AgendaJeff · ${labelAction(action)}`,
      `Tipo: ${asText(data.tipo) || "evento"}`,
      `Actividad: ${asText(data.titulo) || "Sin título"}`,
      `Fecha: ${asText(data.fechaInicio) || "Sin fecha"}`,
      `Hora: ${hora}`
    ];

    if (asText(data.descripcion)) lines.push(`Descripción: ${asText(data.descripcion)}`);
    if (asText(data.categoriaNombre || data.categoriaId)) lines.push(`Categoría: ${asText(data.categoriaNombre || data.categoriaId)}`);

    return lines.join("\n");
  }

  async function sendItemMessage(item, action) {
    const data = item && typeof item === "object" ? item : {};

    if (data.canales && data.canales.telegram === false) {
      return createResult({ ok: true, status: "skipped", action: "telegramSend", message: "Telegram desactivado para este registro.", data: { item: data } });
    }

    const services = core.Services || {};
    if (!services.waitForConnector) {
      return createResult({ ok: false, action: "telegramSend", message: "Puente de servicios no disponible." });
    }

    const connectorResult = await services.waitForConnector("telegram", "sendMessage", 9000);
    if (!connectorResult.ok || !connectorResult.data || !connectorResult.data.connector) {
      return createResult({ ok: false, status: "pending", action: "telegramSend", message: "Telegram no está listo todavía.", data: { connectorResult } });
    }

    const connector = connectorResult.data.connector;
    const message = formatItemMessage(data, action || "create");
    const sendResult = await connector.sendMessage({ text: message, preferLocal: false });

    return createResult({
      ok: Boolean(sendResult && sendResult.ok),
      status: sendResult && sendResult.ok ? "ready" : "error",
      action: "telegramSend",
      message: sendResult && sendResult.ok ? "Mensaje enviado a Telegram." : "No se pudo enviar Telegram.",
      data: { sendResult, message }
    });
  }

  integrations.Telegram = Object.freeze({ formatItemMessage, sendItemMessage });
})(window);
