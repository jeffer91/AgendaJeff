/*
  Nombre completo: nt-desktop-bridge.js
  Ruta: modulos/notificaciones/desktop/nt-desktop-bridge.js

  Función:
    - Encontrar el puente seguro de Electron desde el iframe del módulo.
*/

(function initNotificacionesDesktopBridge(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const notificaciones = root.Notificaciones = root.Notificaciones || {};
  const desktop = notificaciones.Desktop = notificaciones.Desktop || {};

  function getBridgeCandidates() {
    const candidates = [global];

    try {
      if (global.parent && global.parent !== global) candidates.push(global.parent);
    } catch (error) {}

    try {
      if (global.top && global.top !== global && global.top !== global.parent) candidates.push(global.top);
    } catch (error) {}

    return candidates;
  }

  function findElectronBridge() {
    const candidates = getBridgeCandidates();

    for (let index = 0; index < candidates.length; index += 1) {
      try {
        if (candidates[index].AgendaJeffElectron) {
          return candidates[index].AgendaJeffElectron;
        }
      } catch (error) {}
    }

    return null;
  }

  function getBridgeStatus() {
    const bridge = findElectronBridge();

    return {
      ok: Boolean(bridge && bridge.isElectron),
      hasBridge: Boolean(bridge),
      isElectron: Boolean(bridge && bridge.isElectron),
      hasSend: Boolean(bridge && typeof bridge.sendDesktopNotification === "function"),
      hasDiagnostic: Boolean(bridge && typeof bridge.checkDesktopNotifications === "function"),
      platform: bridge && bridge.platform ? bridge.platform : "browser",
      checkedAt: new Date().toISOString()
    };
  }

  desktop.findElectronBridge = findElectronBridge;
  desktop.getBridgeStatus = getBridgeStatus;
})(window);