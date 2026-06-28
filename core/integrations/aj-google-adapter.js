/*
  Nombre completo: aj-google-adapter.js
  Ruta: core/integrations/aj-google-adapter.js

  Función:
    - Convertir registros AgendaJeff a eventos Google Calendar.
    - Usar el conector existente window.AgendaJeffGoogleCalendar sin modificar el módulo Google Calendar.
*/

(function initAgendaJeffGoogleAdapter(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const integrations = core.Integrations = core.Integrations || {};

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "pending"),
      action: data.action || "googleAdapter",
      source: "agenda-google-adapter",
      message: data.message || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: new Date().toISOString()
    };
  }

  function asText(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateText;
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function toDateTime(dateText, timeText) {
    const date = asText(dateText);
    const time = asText(timeText) || "08:00";
    return `${date}T${time}:00`;
  }

  function buildGoogleEvent(item) {
    const data = item && typeof item === "object" ? item : {};
    const fecha = asText(data.fechaInicio);
    const endDate = asText(data.fechaFin) || fecha;
    const descriptionLines = [asText(data.descripcion)];

    if (data.todoDia || !asText(data.horaInicio)) {
      descriptionLines.push("AgendaJeff: evento sin hora. Avisos internos 06:00, 13:00 y 17:00.");
      return {
        title: asText(data.titulo) || "Evento AgendaJeff",
        description: descriptionLines.filter(Boolean).join("\n"),
        start: toDateTime(fecha, "00:00"),
        end: toDateTime(addDays(endDate, 1), "00:00"),
        calendarId: "primary"
      };
    }

    return {
      title: asText(data.titulo) || "Evento AgendaJeff",
      description: descriptionLines.filter(Boolean).join("\n"),
      start: toDateTime(fecha, data.horaInicio),
      end: toDateTime(endDate, data.horaFin || data.horaInicio),
      calendarId: "primary"
    };
  }

  async function createGoogleEvent(item) {
    const data = item && typeof item === "object" ? item : {};

    if (data.canales && data.canales.googleCalendar === false) {
      return createResult({ ok: true, status: "skipped", action: "googleCreate", message: "Google Calendar desactivado para este registro.", data: { item: data } });
    }

    if (!asText(data.fechaInicio)) {
      return createResult({ ok: false, status: "pending", action: "googleCreate", message: "No se envía a Google Calendar porque falta fecha de inicio." });
    }

    const services = core.Services || {};
    if (!services.waitForConnector) {
      return createResult({ ok: false, action: "googleCreate", message: "Puente de servicios no disponible." });
    }

    const connectorResult = await services.waitForConnector("googleCalendar", "createEvent", 10000);
    if (!connectorResult.ok || !connectorResult.data || !connectorResult.data.connector) {
      return createResult({ ok: false, status: "pending", action: "googleCreate", message: "Google Calendar no está listo todavía.", data: { connectorResult } });
    }

    const connector = connectorResult.data.connector;
    const eventPayload = buildGoogleEvent(data);
    const createResultRaw = await connector.createEvent(eventPayload, {});

    return createResult({
      ok: Boolean(createResultRaw && createResultRaw.ok),
      status: createResultRaw && createResultRaw.ok ? "ready" : "error",
      action: "googleCreate",
      message: createResultRaw && createResultRaw.ok ? "Evento enviado a Google Calendar." : "No se pudo crear el evento en Google Calendar.",
      data: { createResult: createResultRaw, eventPayload }
    });
  }

  integrations.GoogleCalendar = Object.freeze({ buildGoogleEvent, createGoogleEvent });
})(window);
