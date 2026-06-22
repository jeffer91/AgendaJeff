/*
  Nombre completo: ag-notifications.adapter.js
  Ruta: Agendador/js/conexiones/ag-notifications.adapter.js

  Función:
    - Adaptador del Agendador para Notificaciones Desktop.
    - Usa el módulo notificaciones-desktop si está cargado.
    - En navegador, intenta notificación web.
    - En Electron, deja preparado el estado para que el puente Electron lo tome después.
    - No depende del HTML de nt-index.html.
    - No presiona botones de Notificaciones Desktop.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../servicios/ag-reminder.service.js
    - ../../notificaciones-desktop/js/nt-config.js
    - ../../notificaciones-desktop/js/nt-environment.service.js
    - ../../notificaciones-desktop/js/nt-notification-api.js
    - ../../notificaciones-desktop/js/nt-electron-bridge.js
*/

(function initAgNotificationsAdapter(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function isNotificationsModuleAvailable() {
    return Boolean(
      global.NT &&
      global.NT.NotificationApi
    );
  }

  function getEnvironment() {
    if (
      global.NT &&
      global.NT.EnvironmentService &&
      typeof global.NT.EnvironmentService.detectEnvironment === "function"
    ) {
      return global.NT.EnvironmentService.detectEnvironment();
    }

    return {
      environmentMode: "web",
      electronAvailable: false,
      webNotificationsSupported: typeof global.Notification === "function",
      webNotificationsPermission: typeof global.Notification === "function"
        ? global.Notification.permission
        : "unsupported"
    };
  }

  function createNotificationPayload(item) {
    const safeItem = item || {};
    const responsible = safeItem.responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const typeLabel = CONFIG.TYPE_LABELS[safeItem.type] || "Registro";

    const bodyParts = [
      safeItem.date ? `Fecha: ${safeItem.date}` : "",
      safeItem.time ? `Hora: ${safeItem.time}` : "",
      responsible.name ? `Responsable: ${responsible.name}` : "",
      safeItem.description ? safeItem.description : ""
    ].filter(Boolean);

    return {
      testType: "agendador-item",
      title: `AgendaJeff - ${typeLabel}`,
      body: `${safeItem.title || "Sin título"}\n${bodyParts.join("\n")}`.trim(),
      tag: `agendador-${safeItem.id || Date.now()}`
    };
  }

  async function sendWebNotification(item) {
    if (
      global.NT &&
      global.NT.NotificationApi &&
      typeof global.NT.NotificationApi.showWebNotification === "function"
    ) {
      return await global.NT.NotificationApi.showWebNotification(
        createNotificationPayload(item)
      );
    }

    if (typeof global.Notification !== "function") {
      throw new Error("Este navegador no soporta notificaciones web.");
    }

    let permission = global.Notification.permission;

    if (permission === "default") {
      permission = await global.Notification.requestPermission();
    }

    if (permission !== "granted") {
      throw new Error("No hay permiso para mostrar notificaciones web.");
    }

    const payload = createNotificationPayload(item);

    const notification = new global.Notification(payload.title, {
      body: payload.body,
      tag: payload.tag
    });

    notification.onclick = function handleClick() {
      try {
        global.focus();
      } catch (error) {
        // No detenemos la notificación si el navegador no permite focus.
      }

      notification.close();
    };

    return {
      ok: true,
      message: "Notificación web enviada correctamente.",
      payload
    };
  }

  function saveScheduledRemindersLocally(item) {
    const reminders = AG.ReminderService
      ? AG.ReminderService.buildReminderSchedule(item)
      : [];

    const scheduledReminders = reminders.filter((reminder) => {
      return reminder.status === "scheduled";
    });

    const savedReminderState = {
      itemId: item.id,
      itemTitle: item.title,
      reminders: scheduledReminders,
      savedAt: new Date().toISOString()
    };

    const key = "ag_agendador_scheduled_notifications_v1";
    let current = [];

    try {
      current = JSON.parse(global.localStorage.getItem(key) || "[]");
    } catch (error) {
      current = [];
    }

    const filtered = current.filter((entry) => entry.itemId !== item.id);
    filtered.push(savedReminderState);

    global.localStorage.setItem(key, JSON.stringify(filtered));

    return savedReminderState;
  }

  async function syncItem(item) {
    if (!Array.isArray(item.channels) || !item.channels.includes(CONFIG.CONNECTIONS.DESKTOP)) {
      return {
        ok: true,
        status: "skipped",
        message: "Notificaciones no está seleccionado para este registro."
      };
    }

    const environment = getEnvironment();
    const scheduled = saveScheduledRemindersLocally(item);

    if (!isNotificationsModuleAvailable() && typeof global.Notification !== "function") {
      return {
        ok: false,
        status: "missingAdapterDependency",
        message: "No está cargado el módulo Notificaciones ni existe Notification API."
      };
    }

    try {
      const webResult = await sendWebNotification(item);

      return {
        ok: true,
        status: "scheduled",
        message: "Notificación web enviada y recordatorios guardados localmente.",
        data: {
          environment,
          webResult,
          scheduled
        }
      };
    } catch (error) {
      if (environment && environment.electronAvailable) {
        return {
          ok: true,
          status: "scheduledForElectron",
          message: "Recordatorios guardados para Electron. La notificación web no se mostró.",
          data: {
            environment,
            scheduled,
            webWarning: error.message
          }
        };
      }

      return {
        ok: false,
        status: "notificationError",
        message: error.message,
        data: {
          environment,
          scheduled
        }
      };
    }
  }

  async function testAvailability() {
    const environment = getEnvironment();

    if (!isNotificationsModuleAvailable() && typeof global.Notification !== "function") {
      return {
        ok: false,
        status: "missing",
        message: "Notificaciones no está cargado."
      };
    }

    if (environment.electronAvailable) {
      return {
        ok: true,
        status: "electronReady",
        message: "Entorno Electron detectado para notificaciones.",
        data: environment
      };
    }

    return {
      ok: Boolean(environment.webNotificationsSupported),
      status: environment.webNotificationsSupported ? "webReady" : "unsupported",
      message: environment.webNotificationsSupported
        ? "Notificaciones web disponibles."
        : "Este navegador no soporta notificaciones web.",
      data: environment
    };
  }

  AG.Adapters.NotificationsAdapter = {
    isNotificationsModuleAvailable,
    getEnvironment,
    createNotificationPayload,
    sendWebNotification,
    saveScheduledRemindersLocally,
    syncItem,
    testAvailability
  };
})(window);