/*
  Nombre completo: nt-ui-dom.js
  Ruta: modulos/notificaciones/ui/nt-ui-dom.js

  Función:
    - Centralizar lectura de elementos HTML del módulo Notificaciones.
*/

(function initNotificacionesUiDom(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const ui = nt.UI = nt.UI || {};

  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function getElements() {
    return {
      statusBadge: byId("ntStatusBadge"),
      statusTitle: byId("ntStatusTitle"),
      statusDescription: byId("ntStatusDescription"),
      statusEnvironment: byId("ntStatusEnvironment"),
      statusUpdatedAt: byId("ntStatusUpdatedAt"),
      electronStatus: byId("ntElectronStatus"),
      bridgeStatus: byId("ntBridgeStatus"),
      nativeStatus: byId("ntNativeStatus"),
      lastTestStatus: byId("ntLastTestStatus"),
      titleInput: byId("ntTitle"),
      bodyInput: byId("ntBody"),
      delaySelect: byId("ntDelaySeconds"),
      btnNormal: byId("ntBtnNormal"),
      btnSound: byId("ntBtnSound"),
      btnSilent: byId("ntBtnSilent"),
      btnLong: byId("ntBtnLong"),
      btnReminder: byId("ntBtnReminder"),
      btnSuccess: byId("ntBtnSuccess"),
      btnError: byId("ntBtnError"),
      btnDiagnostic: byId("ntBtnDiagnostic"),
      resultBox: byId("ntResultBox"),
      diagnosticBox: byId("ntDiagnosticBox"),
      jsonBox: byId("ntJsonBox")
    };
  }

  function readTestForm() {
    const elements = getElements();
    const defaults = nt.CONFIG && nt.CONFIG.defaults ? nt.CONFIG.defaults : {};
    const delaySeconds = Number(elements.delaySelect && elements.delaySelect.value ? elements.delaySelect.value : defaults.delaySeconds || 5);

    return {
      title: elements.titleInput && elements.titleInput.value ? elements.titleInput.value : defaults.title || "AgendaJeff",
      body: elements.bodyInput && elements.bodyInput.value ? elements.bodyInput.value : defaults.body || "notificaciones prueba",
      delaySeconds,
      delayMs: delaySeconds * 1000
    };
  }

  ui.Dom = Object.freeze({
    byId,
    getElements,
    readTestForm
  });
})(window);