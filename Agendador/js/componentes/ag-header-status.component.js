/*
  Nombre completo: ag-header-status.component.js
  Ruta: Agendador/js/componentes/ag-header-status.component.js

  Función:
    - Componente visual para los íconos/chips superiores.
    - Muestra estado de Local, Firebase, Telegram, Google, Microsoft y Notificaciones.
    - Usa colores:
        gris = sin probar
        verde = funcionando
        amarillo = pendiente/advertencia
        rojo = error
    - Permite refrescar estados desde localStorage.
    - No se conecta directamente a APIs externas.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../ag-ui.js
*/

(function initAgHeaderStatusComponent(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Components = AG.Components || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    if (AG.UI && typeof AG.UI.escapeHtml === "function") {
      return AG.UI.escapeHtml(value);
    }

    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getConnectionOrder() {
    return [
      CONFIG.CONNECTIONS.LOCAL,
      CONFIG.CONNECTIONS.FIREBASE,
      CONFIG.CONNECTIONS.TELEGRAM,
      CONFIG.CONNECTIONS.GOOGLE,
      CONFIG.CONNECTIONS.MICROSOFT,
      CONFIG.CONNECTIONS.DESKTOP
    ];
  }

  function normalizeStatus(status) {
    const value = normalizeText(status);

    if (
      value === CONFIG.CONNECTION_STATUS.OK ||
      value === CONFIG.CONNECTION_STATUS.WARNING ||
      value === CONFIG.CONNECTION_STATUS.ERROR ||
      value === CONFIG.CONNECTION_STATUS.IDLE
    ) {
      return value;
    }

    return CONFIG.CONNECTION_STATUS.IDLE;
  }

  function createChipHtml(connectionName, connectionData) {
    const safeData = connectionData || {};
    const status = normalizeStatus(safeData.status);
    const label = safeData.label || CONFIG.CONNECTION_LABELS[connectionName] || connectionName;
    const message = safeData.message || "Sin probar";
    const checkedAt = safeData.checkedAt
      ? `\nÚltima revisión: ${safeData.checkedAt}`
      : "";

    return [
      `<button class="ag-chip ag-chip--${escapeHtml(status)}" type="button" title="${escapeHtml(message + checkedAt)}">`,
      `<span class="ag-dot"></span>`,
      `<span>${escapeHtml(label)}</span>`,
      `</button>`
    ].join("");
  }

  function render(container, statusMap) {
    const target = typeof container === "string"
      ? document.getElementById(container)
      : container;

    if (!target) {
      return null;
    }

    const safeStatusMap = statusMap || AG.Storage.readConnectionStatus();

    target.innerHTML = getConnectionOrder()
      .map((connectionName) => {
        return createChipHtml(connectionName, safeStatusMap[connectionName]);
      })
      .join("");

    return target;
  }

  function refresh() {
    return render("agConnectionStatus", AG.Storage.readConnectionStatus());
  }

  function setStatus(connectionName, status, message) {
    const result = AG.Storage.setConnectionStatus(connectionName, status, message);
    refresh();
    return result;
  }

  function markOk(connectionName, message) {
    return setStatus(
      connectionName,
      CONFIG.CONNECTION_STATUS.OK,
      message || "Funcionando."
    );
  }

  function markWarning(connectionName, message) {
    return setStatus(
      connectionName,
      CONFIG.CONNECTION_STATUS.WARNING,
      message || "Pendiente."
    );
  }

  function markError(connectionName, message) {
    return setStatus(
      connectionName,
      CONFIG.CONNECTION_STATUS.ERROR,
      message || "Error."
    );
  }

  function markIdle(connectionName, message) {
    return setStatus(
      connectionName,
      CONFIG.CONNECTION_STATUS.IDLE,
      message || "Sin probar."
    );
  }

  AG.Components.HeaderStatus = {
    getConnectionOrder,
    createChipHtml,
    render,
    refresh,
    setStatus,
    markOk,
    markWarning,
    markError,
    markIdle
  };
})(window);