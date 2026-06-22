/*
  Nombre completo: nt-ui.js
  Ruta: notificaciones-desktop/js/nt-ui.js
  Función:
    - Centralizar cambios visuales del módulo Notificaciones Desktop.
    - Mostrar resultados en pantalla.
    - Cambiar estado superior.
    - Pintar configuración local en inputs.
    - Mostrar errores limpios.
    - Reutilizar nt-environment.service.js cuando ya está disponible.

  Se conecta con:
    - nt-config.js
    - nt-storage.js
    - nt-environment.service.js
    - nt-actions.js
    - nt-app.js
*/

(function initNtUi(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const Utils = NT.Utils;

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = getElement(id);

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  function setOutput(payload) {
    if (
      NT.EnvironmentService &&
      typeof NT.EnvironmentService.setOutput === "function"
    ) {
      NT.EnvironmentService.setOutput(payload);
      return;
    }

    const output = getElement("ntOutput");

    if (!output) {
      return;
    }

    if (typeof payload === "string") {
      output.textContent = payload;
      return;
    }

    output.textContent = JSON.stringify(payload, null, 2);
  }

  function setStatus(type, text) {
    if (
      NT.EnvironmentService &&
      typeof NT.EnvironmentService.setStatus === "function"
    ) {
      NT.EnvironmentService.setStatus(type, text);
      return;
    }

    const badge = getElement("ntStatusBadge");

    if (!badge) {
      return;
    }

    const classMap = {
      idle: "nt-status nt-status--idle",
      ok: "nt-status nt-status--ok",
      error: "nt-status nt-status--error",
      loading: "nt-status nt-status--loading"
    };

    badge.className = classMap[type] || classMap.idle;
    badge.textContent = text || "Sin probar";
  }

  function renderEnvironment(status) {
    if (
      NT.EnvironmentService &&
      typeof NT.EnvironmentService.renderEnvironment === "function"
    ) {
      return NT.EnvironmentService.renderEnvironment(status);
    }

    return status;
  }

  function renderSettings(settings) {
    if (NT.Storage && typeof NT.Storage.writeSettingsToInputs === "function") {
      return NT.Storage.writeSettingsToInputs(settings);
    }

    return settings;
  }

  function showLoading(message) {
    setStatus("loading", "Procesando");
    setOutput({
      ok: true,
      message: message || "Procesando acción..."
    });
  }

  function showSuccess(message, data) {
    setStatus("ok", "Correcto");

    setOutput({
      ok: true,
      message: message || "Acción ejecutada correctamente.",
      data: data || null,
      shownAt: Utils.nowIso()
    });
  }

  function showError(error, extraData) {
    const message = error && error.message
      ? error.message
      : String(error || "Error desconocido.");

    setStatus("error", "Error");

    setOutput({
      ok: false,
      message,
      data: extraData || null,
      shownAt: Utils.nowIso()
    });
  }

  function showElectronOnly(testName, result) {
    const safeResult = result || {
      ok: false,
      mode: "web",
      testName,
      message: "Esto solo funcionará en modo Electron. Ahora estás en modo Web."
    };

    setStatus(safeResult.ok ? "ok" : "error", safeResult.ok ? "Electron" : "Solo Electron");
    setOutput(safeResult);
  }

  function refreshEnvironment() {
    if (!NT.EnvironmentService) {
      return null;
    }

    const status = NT.EnvironmentService.detectEnvironment();
    renderEnvironment(status);

    return status;
  }

  NT.UI = {
    getElement,
    setText,
    setOutput,
    setStatus,
    renderEnvironment,
    renderSettings,
    showLoading,
    showSuccess,
    showError,
    showElectronOnly,
    refreshEnvironment
  };
})(window);