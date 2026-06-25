/*
  Nombre completo: tl-render-status.js
  Ruta: modulos/telegram/ui/render/tl-render-status.js

  Función:
    - Pintar el estado general de conexión Telegram.
    - Mostrar estado, origen, fecha, Firebase, localStorage, Telegram API y Electron.
    - No leer Firebase, localStorage ni API; solo pinta resultados recibidos.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-status.js
    - modulos/telegram/connection/tl-connection-status.js
    - modulos/telegram/connector/tl-connector-status.js
    - modulos/telegram/ui/events/*
*/

(function initTelegramRenderStatus(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const render = ui.Render = ui.Render || {};

  function getDomStatus() {
    return ui.Dom && ui.Dom.Status ? ui.Dom.Status : null;
  }

  function normalizeStatus(value) {
    const text = value || "idle";
    const allowed = ["idle", "ready", "partial", "error", "testing", "saving", "loading", "cleared"];

    return allowed.includes(text) ? text : "idle";
  }

  function getReadableStatus(status) {
    const map = {
      idle: "Sin configurar",
      ready: "Lista",
      partial: "Incompleta",
      error: "Con error",
      testing: "Probando",
      saving: "Guardando",
      loading: "Cargando",
      cleared: "Limpiada"
    };

    return map[status] || "Sin configurar";
  }

  function extractConnection(input) {
    if (!input) {
      return {};
    }

    if (input.data && input.data.publicConnection) {
      return input.data.publicConnection;
    }

    if (input.data && input.data.connection) {
      return input.data.connection;
    }

    return input;
  }

  function renderConnectionStatus(input) {
    const domStatus = getDomStatus();

    if (!domStatus) {
      return false;
    }

    const elements = domStatus.getStatusElements();
    const connection = extractConnection(input);
    const status = normalizeStatus(connection.status || connection.estado || (input && input.status));
    const message = input && input.message ? input.message : getReadableStatus(status);

    domStatus.setText(elements.statusBadge, getReadableStatus(status));
    domStatus.setStatusClass(elements.statusBadge, status);
    domStatus.setText(elements.statusTitle, getReadableStatus(status));
    domStatus.setText(elements.statusDescription, message);
    domStatus.setText(elements.statusSource, connection.source || (input && input.source) || "sin origen");
    domStatus.setText(elements.statusUpdatedAt, connection.updatedAt || connection.lastCheckedAt || (input && input.checkedAt) || "sin fecha");

    domStatus.setMiniStatus(
      "firebaseStatus",
      connection.firebaseConnectionOk ? "ready" : "idle",
      connection.firebaseConnectionOk ? "Firebase OK" : "Firebase pendiente"
    );

    domStatus.setMiniStatus(
      "localStatus",
      connection.source === "local" ? "ready" : "idle",
      connection.source === "local" ? "Usando local" : "Local disponible"
    );

    domStatus.setMiniStatus(
      "telegramStatus",
      connection.telegramConnectionOk ? "ready" : status,
      connection.telegramConnectionOk ? "Telegram OK" : "Telegram pendiente"
    );

    domStatus.setMiniStatus(
      "electronStatus",
      global.AgendaJeffElectron ? "ready" : "idle",
      global.AgendaJeffElectron ? "Electron" : "Navegador"
    );

    return true;
  }

  function renderLoadingStatus(message) {
    return renderConnectionStatus({
      ok: false,
      status: "loading",
      source: "ui",
      message: message || "Cargando Telegram...",
      data: {
        connection: {
          status: "loading",
          source: "ui"
        }
      }
    });
  }

  render.renderConnectionStatus = renderConnectionStatus;
  render.renderLoadingStatus = renderLoadingStatus;
})(window);
