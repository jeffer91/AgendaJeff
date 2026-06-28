/*
  Nombre completo: nt-diagnostic-state.js
  Ruta: modulos/notificaciones/diagnostic/nt-diagnostic-state.js

  Función:
    - Revisar capas internas del módulo Notificaciones.
*/

(function initNotificacionesDiagnosticState(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const diagnostic = nt.Diagnostic = nt.Diagnostic || {};

  function layer(path, value) {
    return { path, ok: Boolean(value) };
  }

  function checkLayers() {
    const checks = [
      layer("CONFIG", nt.CONFIG),
      layer("Utils.Normalize", nt.Utils && nt.Utils.Normalize),
      layer("Desktop.findElectronBridge", nt.Desktop && nt.Desktop.findElectronBridge),
      layer("Desktop.getBridgeStatus", nt.Desktop && nt.Desktop.getBridgeStatus),
      layer("Desktop.send", nt.Desktop && nt.Desktop.send),
      layer("Desktop.buildPayload", nt.Desktop && nt.Desktop.buildPayload),
      layer("Visual.Container", nt.Visual && nt.Visual.Container),
      layer("Visual.Toast", nt.Visual && nt.Visual.Toast),
      layer("Visual.Banner", nt.Visual && nt.Visual.Banner),
      layer("Visual.Center", nt.Visual && nt.Visual.Center),
      layer("Visual.sendVisualNotification", nt.Visual && nt.Visual.sendVisualNotification),
      layer("UI.Dom", nt.UI && nt.UI.Dom),
      layer("UI.Render", nt.UI && nt.UI.Render),
      layer("UI.Events", nt.UI && nt.UI.Events)
    ];

    return {
      ok: checks.every(function everyCheck(check) { return check.ok; }),
      checks,
      missing: checks.filter(function filterMissing(check) { return !check.ok; }),
      checkedAt: new Date().toISOString()
    };
  }

  async function checkDesktop() {
    const desktop = nt.Desktop || {};
    const bridge = desktop.findElectronBridge ? desktop.findElectronBridge() : null;
    const methodName = "check" + "Desktop" + "Notifications";

    if (!bridge || typeof bridge[methodName] !== "function") {
      return {
        ok: false,
        hasBridge: Boolean(bridge),
        message: "No se encontró diagnóstico de notificaciones en Electron.",
        checkedAt: new Date().toISOString()
      };
    }

    return bridge[methodName]();
  }

  diagnostic.checkLayers = checkLayers;
  diagnostic.checkDesktop = checkDesktop;
})(window);