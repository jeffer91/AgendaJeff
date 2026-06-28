/*
  Nombre completo: nt-start.js
  Ruta: modulos/notificaciones/startup/nt-start.js

  Función:
    - Iniciar el módulo Notificaciones.
    - Activar eventos y ejecutar diagnóstico inicial.
*/

(function initNotificacionesStartup(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const startup = nt.Startup = nt.Startup || {};

  let started = false;

  function isDocumentReady() {
    return global.document && ["interactive", "complete"].includes(global.document.readyState);
  }

  function onReady(callback) {
    if (!global.document || isDocumentReady()) {
      callback();
      return;
    }

    global.document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  async function startModule() {
    if (started) {
      return nt.createResult({ ok: true, status: "ready", action: "init", source: "startup", message: "Módulo Notificaciones ya estaba iniciado." });
    }

    const render = nt.UI && nt.UI.Render ? nt.UI.Render : {};
    const events = nt.UI && nt.UI.Events ? nt.UI.Events : {};
    let attachResult = null;
    let diagnosticResult = null;

    if (events.attachEvents) {
      attachResult = events.attachEvents();
    }

    if (nt.Diagnostic && nt.Diagnostic.runDiagnosticReport) {
      diagnosticResult = await nt.Diagnostic.runDiagnosticReport();
      if (render.renderDiagnostic) render.renderDiagnostic(diagnosticResult);
    }

    started = true;

    const result = nt.createResult({
      ok: true,
      status: "ready",
      action: "init",
      source: "startup",
      file: "modulos/notificaciones/startup/nt-start.js",
      message: "Módulo Notificaciones iniciado correctamente.",
      data: { attachResult, diagnosticResult }
    });

    if (render.renderInfo) {
      render.renderInfo("Módulo Notificaciones iniciado. Puedes ejecutar pruebas.", result);
    }

    return result;
  }

  function autoStart() {
    onReady(function ready() {
      startModule();
    });
  }

  startup.startModule = startModule;
  startup.autoStart = autoStart;

  autoStart();
})(window);