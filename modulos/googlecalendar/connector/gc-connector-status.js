/*
  Nombre completo: gc-connector-status.js
  Ruta: modulos/googlecalendar/connector/gc-connector-status.js

  Función:
    - Exponer estado público de Google Calendar para otros módulos de AgendaJeff.
    - Ocultar datos sensibles y no obligar a otros módulos a conocer Firebase/Auth/API.
    - Crear puerta pública window.AgendaJeffGoogleCalendar.

  Se conecta con:
    - modulos/googlecalendar/connection/gc-connection-read.js
    - modulos/googlecalendar/connection/gc-connection-status.js
*/

(function initGoogleCalendarConnectorStatus(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const connector = googleCalendar.Connector = googleCalendar.Connector || {};
  const publicConnector = global.AgendaJeffGoogleCalendar = global.AgendaJeffGoogleCalendar || {};

  let lastStatusResult = null;

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  function toPublicConnection(connection) {
    const data = connection && typeof connection === "object" ? connection : {};

    return {
      provider: data.provider || data.proveedor || "googleCalendar",
      enabled: data.enabled !== false,
      configured: Boolean(data.configured || data.configurado),
      status: data.status || data.estado || "idle",
      calendarId: data.calendarId || "primary",
      activeCredentialType: data.activeCredentialType || "desktop",
      firebaseConnectionOk: Boolean(data.firebaseConnectionOk || data.firebaseConexionOk),
      authOk: Boolean(data.authOk),
      googleConnectionOk: Boolean(data.googleConnectionOk || data.calendarConnectionOk),
      lastAction: data.lastAction || data.ultimaAccion || "",
      lastError: data.lastError || data.ultimoError || "",
      updatedAt: data.updatedAt || data.actualizadoEn || ""
    };
  }

  async function getStatus(options) {
    const connection = googleCalendar.Connection || {};
    const opts = options && typeof options === "object" ? options : {};
    const readResult = connection.readConnection
      ? await connection.readConnection({ preferLocal: opts.preferLocal === true })
      : null;
    const data = readResult && readResult.data ? readResult.data.connection : null;
    const publicConnection = toPublicConnection(data);

    lastStatusResult = createResult({
      ok: Boolean(readResult && readResult.ok && publicConnection.status === "ready"),
      status: publicConnection.status,
      action: "status",
      source: "connector",
      file: "modulos/googlecalendar/connector/gc-connector-status.js",
      message: readResult && readResult.ok ? "Estado Google Calendar obtenido." : "No se pudo obtener estado Google Calendar.",
      error: readResult && readResult.error ? readResult.error : null,
      data: { publicConnection, readResult }
    });

    return lastStatusResult;
  }

  async function isReady(options) {
    const result = await getStatus(options);
    return Boolean(result && result.ok && result.status === "ready");
  }

  function getLastStatus() {
    return lastStatusResult;
  }

  connector.toPublicConnection = toPublicConnection;
  connector.getStatus = getStatus;
  connector.isReady = isReady;
  connector.getLastStatus = getLastStatus;

  publicConnector.getStatus = getStatus;
  publicConnector.isReady = isReady;
  publicConnector.getLastStatus = getLastStatus;
})(window);
