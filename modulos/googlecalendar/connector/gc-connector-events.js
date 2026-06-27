/*
  Nombre completo: gc-connector-events.js
  Ruta: modulos/googlecalendar/connector/gc-connector-events.js

  Función:
    - Exponer creación y lectura de eventos para otros módulos de AgendaJeff.
    - Evitar que Agenda/Pendientes tenga que conocer Auth, Firebase o API interna.
    - Mantener una puerta pública estable en window.AgendaJeffGoogleCalendar.

  Se conecta con:
    - modulos/googlecalendar/api/gc-api-events-read.js
    - modulos/googlecalendar/api/gc-api-events-create.js
    - modulos/googlecalendar/connector/gc-connector-status.js
*/

(function initGoogleCalendarConnectorEvents(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const connector = googleCalendar.Connector = googleCalendar.Connector || {};
  const publicConnector = global.AgendaJeffGoogleCalendar = global.AgendaJeffGoogleCalendar || {};

  let lastEventResult = null;

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function createEvent(eventData, options) {
    const api = googleCalendar.Api || {};
    const opts = options && typeof options === "object" ? options : {};

    if (!api.createEvent) {
      lastEventResult = createResult({
        ok: false,
        status: "error",
        action: "createEvent",
        source: "connector",
        file: "modulos/googlecalendar/connector/gc-connector-events.js",
        message: "No está disponible api.createEvent.",
        error: { message: "Falta gc-api-events-create.js", file: "modulos/googlecalendar/api/gc-api-events-create.js" }
      });
      return lastEventResult;
    }

    lastEventResult = await api.createEvent(eventData, opts);
    return lastEventResult;
  }

  async function listEvents(options) {
    const api = googleCalendar.Api || {};
    const opts = options && typeof options === "object" ? options : {};

    if (!api.listEvents) {
      lastEventResult = createResult({
        ok: false,
        status: "error",
        action: "readEvents",
        source: "connector",
        file: "modulos/googlecalendar/connector/gc-connector-events.js",
        message: "No está disponible api.listEvents.",
        error: { message: "Falta gc-api-events-read.js", file: "modulos/googlecalendar/api/gc-api-events-read.js" }
      });
      return lastEventResult;
    }

    lastEventResult = await api.listEvents(opts);
    return lastEventResult;
  }

  function getLastEventResult() {
    return lastEventResult;
  }

  connector.createEvent = createEvent;
  connector.listEvents = listEvents;
  connector.getLastEventResult = getLastEventResult;

  publicConnector.createEvent = createEvent;
  publicConnector.listEvents = listEvents;
  publicConnector.getLastEventResult = getLastEventResult;
})(window);
