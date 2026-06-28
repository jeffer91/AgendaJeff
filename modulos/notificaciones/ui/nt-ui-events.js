/*
  Nombre completo: nt-ui-events.js
  Ruta: modulos/notificaciones/ui/nt-ui-events.js

  Función:
    - Conectar botones del módulo Notificaciones con sus pruebas.
*/

(function initNotificacionesUiEvents(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const ui = nt.UI = nt.UI || {};

  function getDom() { return ui.Dom || {}; }
  function getRender() { return ui.Render || {}; }

  async function runUiAction(label, action) {
    const render = getRender();

    try {
      if (render.setBusy) render.setBusy(true, label || "Procesando...");
      const result = await action();
      if (render.renderResult) render.renderResult(result);
      return result;
    } catch (error) {
      const result = nt.createResult({
        ok: false,
        status: "error",
        action: "uiAction",
        source: "ui",
        file: "modulos/notificaciones/ui/nt-ui-events.js",
        message: "Falló una acción de interfaz del módulo Notificaciones.",
        error: { message: error && error.message ? error.message : String(error), file: "modulos/notificaciones/ui/nt-ui-events.js" }
      });

      if (render.renderResult) render.renderResult(result);
      return result;
    } finally {
      if (render.setBusy) render.setBusy(false);
    }
  }

  async function runDiagnosticAction(label, action) {
    const render = getRender();

    try {
      if (render.setBusy) render.setBusy(true, label || "Ejecutando diagnóstico...");
      const result = await action();
      if (render.renderDiagnostic) render.renderDiagnostic(result);
      return result;
    } catch (error) {
      const result = nt.createResult({
        ok: false,
        status: "error",
        action: "diagnostic",
        source: "ui",
        file: "modulos/notificaciones/ui/nt-ui-events.js",
        message: "Falló el diagnóstico del módulo Notificaciones.",
        error: { message: error && error.message ? error.message : String(error), file: "modulos/notificaciones/ui/nt-ui-events.js" }
      });

      if (render.renderDiagnostic) render.renderDiagnostic(result);
      return result;
    } finally {
      if (render.setBusy) render.setBusy(false);
    }
  }

  function buildInput() {
    const dom = getDom();
    return dom.readTestForm ? dom.readTestForm() : {};
  }

  function isNativeMode(displayMode) {
    const modes = nt.CONFIG && nt.CONFIG.displayModes ? nt.CONFIG.displayModes : {};
    return displayMode === (modes.NATIVE || "native");
  }

  function sendByDisplayMode(payload) {
    if (isNativeMode(payload.displayMode)) {
      if (!nt.Desktop || !nt.Desktop.send) {
        throw new Error("No está disponible Notificaciones.Desktop.send.");
      }

      return nt.Desktop.send(payload);
    }

    if (!nt.Visual || !nt.Visual.sendVisualNotification) {
      throw new Error("No está disponible Notificaciones.Visual.sendVisualNotification.");
    }

    return nt.Visual.sendVisualNotification(payload.displayMode, payload);
  }

  function handleTest(type) {
    return runUiAction("Probando notificación...", async function testAction() {
      if (!nt.Desktop || !nt.Desktop.buildPayload) {
        throw new Error("No está disponible Notificaciones.Desktop.buildPayload.");
      }

      const payload = nt.Desktop.buildPayload(type, buildInput());
      return sendByDisplayMode(payload);
    });
  }

  function handleDiagnostic() {
    return runDiagnosticAction("Ejecutando diagnóstico...", async function diagnosticAction() {
      if (!nt.Diagnostic || !nt.Diagnostic.runDiagnosticReport) {
        throw new Error("No está disponible Diagnostic.runDiagnosticReport.");
      }

      return nt.Diagnostic.runDiagnosticReport();
    });
  }

  function attachEvents() {
    const dom = getDom();
    const elements = dom.getElements ? dom.getElements() : {};
    const types = nt.CONFIG && nt.CONFIG.types ? nt.CONFIG.types : {};
    const bindings = [
      [elements.btnNormal, function normal() { return handleTest(types.NORMAL || "normal"); }],
      [elements.btnSound, function sound() { return handleTest(types.SOUND || "sound"); }],
      [elements.btnSilent, function silent() { return handleTest(types.SILENT || "silent"); }],
      [elements.btnLong, function longMessage() { return handleTest(types.LONG || "long"); }],
      [elements.btnReminder, function reminder() { return handleTest(types.REMINDER || "reminder"); }],
      [elements.btnSuccess, function success() { return handleTest(types.SUCCESS || "success"); }],
      [elements.btnError, function errorType() { return handleTest(types.ERROR || "error"); }],
      [elements.btnDiagnostic, handleDiagnostic]
    ];

    bindings.forEach(function bindButton(pair) {
      const button = pair[0];
      const handler = pair[1];

      if (button && !button.dataset.ntBound) {
        button.addEventListener("click", handler);
        button.dataset.ntBound = "true";
      }
    });

    return { ok: true, bound: bindings.filter(function count(pair) { return Boolean(pair[0]); }).length };
  }

  ui.Events = Object.freeze({
    runUiAction,
    runDiagnosticAction,
    handleTest,
    handleDiagnostic,
    attachEvents
  });
})(window);