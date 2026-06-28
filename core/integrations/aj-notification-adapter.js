/*
  Nombre completo: aj-notification-adapter.js
  Ruta: core/integrations/aj-notification-adapter.js

  Función:
    - Adaptar registros AgendaJeff a notificaciones de escritorio.
    - Usar preload/Electron cuando esté disponible sin modificar el módulo Notificaciones.
*/

(function initAgendaJeffNotificationAdapter(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const integrations = core.Integrations = core.Integrations || {};

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "pending"),
      action: data.action || "notificationAdapter",
      source: "agenda-notification-adapter",
      message: data.message || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: new Date().toISOString()
    };
  }

  function getBridge() {
    try {
      if (global.AgendaJeffElectron) return global.AgendaJeffElectron;
      if (global.parent && global.parent.AgendaJeffElectron) return global.parent.AgendaJeffElectron;
    } catch (error) {
      return null;
    }
    return null;
  }

  function asText(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function buildNotificationPayload(item, action) {
    const data = item && typeof item === "object" ? item : {};
    const titlePrefix = action === "complete" ? "Completado" : action === "update" ? "Actualizado" : "Creado";
    const dateText = data.fechaInicio ? ` · ${data.fechaInicio}` : "";
    const timeText = data.horaInicio ? ` ${data.horaInicio}` : "";

    return {
      title: `AgendaJeff · ${titlePrefix}`,
      body: `${asText(data.titulo) || "Registro"}${dateText}${timeText}`,
      silent: false,
      type: action || "create"
    };
  }

  async function sendItemNotification(item, action) {
    const data = item && typeof item === "object" ? item : {};

    if (data.canales && data.canales.escritorio === false) {
      return createResult({ ok: true, status: "skipped", action: "desktopNotify", message: "Notificación de escritorio desactivada para este registro.", data: { item: data } });
    }

    const bridge = getBridge();
    if (!bridge || typeof bridge.sendDesktopNotification !== "function") {
      return createResult({ ok: false, status: "pending", action: "desktopNotify", message: "Puente Electron no disponible para notificación." });
    }

    const payload = buildNotificationPayload(data, action || "create");
    const notifyResult = await bridge.sendDesktopNotification(payload);

    return createResult({
      ok: Boolean(notifyResult && notifyResult.ok),
      status: notifyResult && notifyResult.ok ? "ready" : "error",
      action: "desktopNotify",
      message: notifyResult && notifyResult.ok ? "Notificación de escritorio enviada." : "No se pudo enviar notificación de escritorio.",
      data: { notifyResult, payload }
    });
  }

  integrations.Notifications = Object.freeze({ buildNotificationPayload, sendItemNotification });
})(window);
