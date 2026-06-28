/* nt-desktop-send.js */
(function initNtDesktopSend(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const desktop = nt.Desktop = nt.Desktop || {};

  function makeResult(payload) {
    return typeof nt.createResult === "function"
      ? nt.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  function pause(milliseconds) {
    return new Promise(function wait(resolve) {
      global.setTimeout(resolve, Math.max(0, Number(milliseconds) || 0));
    });
  }

  async function send(payload) {
    const bridge = desktop.findElectronBridge ? desktop.findElectronBridge() : null;
    const methodName = ["send", "Desktop", "Notification"].join("");
    const cleanPayload = payload && typeof payload === "object" ? payload : {};

    if (!bridge || typeof bridge[methodName] !== "function") {
      return makeResult({
        ok: false,
        status: "error",
        action: "sendNotification",
        source: "desktop",
        file: "modulos/notificaciones/desktop/nt-desktop-send.js",
        message: "Puente Electron no disponible."
      });
    }

    if (cleanPayload.delayMs > 0) {
      await pause(cleanPayload.delayMs);
    }

    const result = await bridge[methodName](cleanPayload);

    return makeResult({
      ok: Boolean(result && result.ok),
      status: result && result.ok ? "success" : "error",
      action: "sendNotification",
      source: "desktop",
      file: "modulos/notificaciones/desktop/nt-desktop-send.js",
      message: result && result.message ? result.message : "Prueba ejecutada.",
      data: { payload: cleanPayload, result }
    });
  }

  desktop.send = send;
})(window);