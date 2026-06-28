/*
  Nombre completo: nt-ui-render.js
  Ruta: modulos/notificaciones/ui/nt-ui-render.js

  Función:
    - Pintar estados, resultados, diagnóstico y JSON técnico.
*/

(function initNotificacionesUiRender(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const ui = nt.UI = nt.UI || {};

  function getElements() {
    return ui.Dom && ui.Dom.getElements ? ui.Dom.getElements() : {};
  }

  function setText(element, value) {
    if (element) element.textContent = value || "";
  }

  function setStatusClass(element, status) {
    if (!element) return;
    element.classList.remove("is-idle", "is-ready", "is-success", "is-warning", "is-testing", "is-error");
    element.classList.add("is-" + (status || "idle"));
  }

  function renderJson(data) {
    const elements = getElements();
    if (elements.jsonBox) {
      elements.jsonBox.textContent = JSON.stringify(data || {}, null, 2);
    }
  }

  function renderResult(result) {
    const elements = getElements();
    const status = result && result.ok ? "success" : "error";
    setText(elements.resultBox, JSON.stringify(result || {}, null, 2));
    setText(elements.lastTestStatus, result && result.ok ? "Correcta" : "Revisar");
    setStatusClass(elements.lastTestStatus, status);
    renderJson(result || {});
  }

  function renderDiagnostic(result) {
    const elements = getElements();
    const data = result && result.data ? result.data : {};
    const bridge = data.bridgeStatus || {};
    const desktop = data.desktopStatus || {};
    const layers = data.layers || {};
    const status = result && result.ok ? "ready" : "warning";

    setText(elements.diagnosticBox, JSON.stringify(result || {}, null, 2));
    setText(elements.statusBadge, result && result.ok ? "Listo" : "Parcial");
    setStatusClass(elements.statusBadge, status);
    setText(elements.statusTitle, result && result.ok ? "Notificaciones disponibles" : "Revisar notificaciones");
    setText(elements.statusDescription, result && result.message ? result.message : "Diagnóstico ejecutado.");
    setText(elements.statusEnvironment, bridge.platform || desktop.platform || "pendiente");
    setText(elements.statusUpdatedAt, result && result.checkedAt ? result.checkedAt : new Date().toISOString());
    setText(elements.electronStatus, bridge.isElectron ? "Activo" : "No detectado");
    setStatusClass(elements.electronStatus, bridge.isElectron ? "ready" : "warning");
    setText(elements.bridgeStatus, bridge.hasBridge ? "Disponible" : "Pendiente");
    setStatusClass(elements.bridgeStatus, bridge.hasBridge ? "ready" : "warning");
    setText(elements.nativeStatus, desktop.supported ? "Soportadas" : "Revisar");
    setStatusClass(elements.nativeStatus, desktop.supported ? "ready" : "warning");

    renderJson({ result, layers, bridge, desktop });
  }

  function setBusy(isBusy, label) {
    const elements = getElements();
    const buttons = [elements.btnNormal, elements.btnSound, elements.btnSilent, elements.btnLong, elements.btnReminder, elements.btnSuccess, elements.btnError, elements.btnDiagnostic];
    buttons.forEach(function eachButton(button) {
      if (button) button.disabled = Boolean(isBusy);
    });

    if (isBusy) {
      setText(elements.statusBadge, "Procesando");
      setStatusClass(elements.statusBadge, "testing");
      setText(elements.statusDescription, label || "Procesando acción.");
    }
  }

  function renderInfo(message) {
    const elements = getElements();
    setText(elements.resultBox, message || "Módulo Notificaciones listo.");
  }

  ui.Render = Object.freeze({
    renderJson,
    renderResult,
    renderDiagnostic,
    setBusy,
    renderInfo
  });
})(window);