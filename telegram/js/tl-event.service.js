/*
  Nombre completo: tl-event.service.js
  Ruta: telegram/js/tl-event.service.js
  Función:
    - Crear un evento de prueba.
    - Convertir el evento en mensaje HTML para Telegram.
  Se conecta con:
    - tl-config.js
    - tl-telegram-api.js
    - tl-app.js
*/

(function initTlEventService(global) {
  "use strict";

  const TL = global.TL;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return normalizeText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createTestEvent(input) {
    const event = {
      id: `tl-event-${Date.now()}`,
      title: normalizeText(input.title),
      date: normalizeText(input.date),
      time: normalizeText(input.time),
      description: normalizeText(input.description),
      createdAt: new Date().toISOString()
    };

    if (!event.title) {
      throw new Error("Falta el título del evento.");
    }

    if (!event.date) {
      throw new Error("Falta la fecha del evento.");
    }

    if (!event.time) {
      throw new Error("Falta la hora del evento.");
    }

    return event;
  }

  function formatEventForTelegram(event) {
    return [
      "🗓️ <b>AgendaJeff - Evento de prueba</b>",
      "",
      `<b>Título:</b> ${escapeHtml(event.title)}`,
      `<b>Fecha:</b> ${escapeHtml(event.date)}`,
      `<b>Hora:</b> ${escapeHtml(event.time)}`,
      "",
      `<b>Descripción:</b>`,
      escapeHtml(event.description || "Sin descripción."),
      "",
      `<b>ID:</b> ${escapeHtml(event.id)}`
    ].join("\n");
  }

  TL.EventService = {
    createTestEvent,
    formatEventForTelegram
  };
})(window);