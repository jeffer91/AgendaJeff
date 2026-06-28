/*
  Nombre completo: nt-visual-send.js
  Ruta: modulos/notificaciones/visual/nt-visual-send.js

  Función:
    - Enrutar una notificación hacia la visualización interna seleccionada.
    - Soportar toast interno, banner superior y alerta central.
*/

(function initNtVisualSend(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const visual = nt.Visual = nt.Visual || {};

  const VISUAL_TYPES = Object.freeze({
    TOAST: "toast",
    BANNER: "banner",
    CENTER: "center"
  });

  function normalizeVisualType(value) {
    const text = value === null || value === undefined ? "" : String(value).trim().toLowerCase();
    const values = Object.keys(VISUAL_TYPES).map(function mapType(key) { return VISUAL_TYPES[key]; });
    return values.includes(text) ? text : VISUAL_TYPES.TOAST;
  }

  function createResult(payload) {
    return typeof nt.createResult === "function"
      ? nt.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  function pause(milliseconds) {
    return new Promise(function wait(resolve) {
      global.setTimeout(resolve, Math.max(0, Number(milliseconds) || 0));
    });
  }

  function showVisual(type, payload) {
    if (type === VISUAL_TYPES.BANNER && visual.Banner && visual.Banner.showBanner) {
      return visual.Banner.showBanner(payload);
    }

    if (type === VISUAL_TYPES.CENTER && visual.Center && visual.Center.showCenter) {
      return visual.Center.showCenter(payload);
    }

    if (visual.Toast && visual.Toast.showToast) {
      return visual.Toast.showToast(payload);
    }

    return null;
  }

  async function sendVisualNotification(visualType, payload) {
    const type = normalizeVisualType(visualType);
    const cleanPayload = payload && typeof payload === "object" ? payload : {};

    if (cleanPayload.delayMs > 0) {
      await pause(cleanPayload.delayMs);
    }

    const result = showVisual(type, cleanPayload);

    if (!result) {
      return createResult({
        ok: false,
        status: "error",
        action: "visualNotification",
        source: "visual",
        file: "modulos/notificaciones/visual/nt-visual-send.js",
        message: "No hay visualización interna disponible.",
        data: { visualType: type, payload: cleanPayload }
      });
    }

    return createResult({
      ok: Boolean(result.ok),
      status: result.ok ? "success" : "error",
      action: "visualNotification",
      source: "visual",
      file: "modulos/notificaciones/visual/nt-visual-send.js",
      message: result.message || "Visualización interna ejecutada.",
      data: { visualType: type, payload: cleanPayload, result }
    });
  }

  visual.Types = VISUAL_TYPES;
  visual.normalizeVisualType = normalizeVisualType;
  visual.sendVisualNotification = sendVisualNotification;
})(window);