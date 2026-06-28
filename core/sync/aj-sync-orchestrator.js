/*
  Nombre completo: aj-sync-orchestrator.js
  Ruta: core/sync/aj-sync-orchestrator.js

  Función:
    - Orquestar sincronización después de crear, editar o completar un registro.
    - Ejecutar salida hacia Google Calendar, Telegram y Notificaciones usando adaptadores.
*/

(function initAgendaJeffSyncOrchestrator(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const sync = core.Sync = core.Sync || {};

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "partial"),
      action: data.action || "syncAfterSave",
      source: "agenda-sync-orchestrator",
      message: data.message || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: new Date().toISOString()
    };
  }

  function shouldUseGoogle(item, action) {
    if (!item || !item.canales || item.canales.googleCalendar !== true) return false;
    if (item.tipo === "pendiente") return false;
    return action === "create";
  }

  async function runSafely(label, fn) {
    try {
      return await fn();
    } catch (error) {
      return createResult({
        ok: false,
        status: "error",
        action: label,
        message: `Falló ${label}.`,
        error: { message: error && error.message ? error.message : String(error) }
      });
    }
  }

  async function syncAfterSave(item, action) {
    const data = item && typeof item === "object" ? item : {};
    const actionName = action || "create";
    const integrations = core.Integrations || {};
    const results = {
      googleCalendar: null,
      telegram: null,
      notificaciones: null
    };

    if (core.Services && typeof core.Services.start === "function") {
      core.Services.start();
    }

    if (shouldUseGoogle(data, actionName) && integrations.GoogleCalendar && integrations.GoogleCalendar.createGoogleEvent) {
      results.googleCalendar = await runSafely("googleCalendar", function sendGoogle() {
        return integrations.GoogleCalendar.createGoogleEvent(data);
      });
    } else {
      results.googleCalendar = createResult({ ok: true, status: "skipped", action: "googleCalendar", message: "Google Calendar omitido para este registro o acción." });
    }

    if (integrations.Telegram && integrations.Telegram.sendItemMessage) {
      results.telegram = await runSafely("telegram", function sendTelegram() {
        return integrations.Telegram.sendItemMessage(data, actionName);
      });
    }

    if (integrations.Notifications && integrations.Notifications.sendItemNotification) {
      results.notificaciones = await runSafely("notificaciones", function sendNotification() {
        return integrations.Notifications.sendItemNotification(data, actionName);
      });
    }

    const successful = Object.keys(results).filter(function filterOk(key) {
      return results[key] && (results[key].ok || results[key].status === "skipped");
    }).length;
    const total = Object.keys(results).filter(function filterAvailable(key) { return Boolean(results[key]); }).length;
    const allOk = total > 0 && successful === total;

    return createResult({
      ok: allOk,
      status: allOk ? "ready" : "partial",
      action: "syncAfterSave",
      message: allOk ? "Sincronización de salida completada." : "Sincronización parcial; revisar detalles.",
      data: { item: data, action: actionName, results }
    });
  }

  sync.syncAfterSave = syncAfterSave;
})(window);
