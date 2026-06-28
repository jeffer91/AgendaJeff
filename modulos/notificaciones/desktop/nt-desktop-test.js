/* nt-desktop-test.js */
(function initNotificacionesDesktopTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const desktop = nt.Desktop = nt.Desktop || {};

  function normalize(input, options) {
    const layer = nt.Utils && nt.Utils.Normalize ? nt.Utils.Normalize : {};
    return typeof layer.normalizePayload === "function"
      ? layer.normalizePayload(input, options)
      : (input && typeof input === "object" ? input : {});
  }

  function withoutDelay(payload) {
    return { ...payload, delayMs: 0, delaySeconds: 0 };
  }

  function buildPayload(type, input) {
    const config = nt.CONFIG || {};
    const types = config.types || {};
    const base = normalize(input || {}, { type });

    if (type === types.SILENT) {
      return withoutDelay({ ...base, type, silent: true });
    }

    if (type === types.LONG) {
      return withoutDelay({ ...base, type, body: base.body + "\n\nMensaje largo para validar el centro de avisos de Windows." });
    }

    if (type === types.REMINDER) {
      return { ...base, type, title: "Recordatorio AgendaJeff", body: base.body + "\n\nRecordatorio simulado. No se creó evento real.", delayMs: Math.max(1000, Number(base.delayMs) || 5000) };
    }

    if (type === types.SUCCESS) {
      return withoutDelay({ ...base, type, title: "AgendaJeff - Éxito", body: base.body + "\n\nPrueba completada correctamente." });
    }

    if (type === types.ERROR) {
      return withoutDelay({ ...base, type, title: "AgendaJeff - Aviso", body: base.body + "\n\nPrueba de aviso tipo error." });
    }

    return withoutDelay({ ...base, type: type || types.NORMAL || "normal" });
  }

  async function runTest(type, input) {
    if (!desktop.send) {
      return nt.createResult({ ok: false, status: "error", action: "testNotification", source: "desktop", file: "modulos/notificaciones/desktop/nt-desktop-test.js", message: "No está disponible desktop.send." });
    }

    return desktop.send(buildPayload(type, input));
  }

  desktop.buildPayload = buildPayload;
  desktop.runTest = runTest;
})(window);