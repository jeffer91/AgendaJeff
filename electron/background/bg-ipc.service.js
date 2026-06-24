/*
  Nombre completo: bg-ipc.service.js
  Ruta: electron/background/bg-ipc.service.js

  Función:
    - Registrar canales IPC seguros para segundo plano.
    - Conectar preload.js con Tray, notificaciones, Telegram, store y motor de recordatorios.
*/

"use strict";

function createBackgroundIpcService(ipcMain, dependencies) {
  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("bg-ipc.service.js requiere ipcMain válido.");
  }

  const deps = dependencies || {};
  const registeredChannels = new Set();

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizePayload(payload) {
    return payload && typeof payload === "object" ? payload : {};
  }

  function register(channel, handler) {
    if (registeredChannels.has(channel)) return;

    ipcMain.handle(channel, async (_event, payload) => {
      try {
        return await handler(normalizePayload(payload));
      } catch (error) {
        return {
          ok: false,
          channel,
          message: error.message,
          handledAt: nowIso()
        };
      }
    });

    registeredChannels.add(channel);
  }

  function getStoreStatus() {
    return deps.storeService && typeof deps.storeService.getStatus === "function"
      ? deps.storeService.getStatus()
      : { ok: false, message: "Store de segundo plano no disponible." };
  }

  function getTrayStatus() {
    return deps.trayService && typeof deps.trayService.getStatus === "function"
      ? deps.trayService.getStatus()
      : null;
  }

  function getEngineStatus() {
    return deps.reminderEngineService && typeof deps.reminderEngineService.getStatus === "function"
      ? deps.reminderEngineService.getStatus()
      : null;
  }

  function getTelegramStatus() {
    return deps.telegramService && typeof deps.telegramService.getSafeStatus === "function"
      ? deps.telegramService.getSafeStatus()
      : null;
  }

  function registerHandlers() {
    register("agendaJeff:background-status", async () => ({
      ok: true,
      mode: "electron",
      message: "Estado del segundo plano leído correctamente.",
      store: getStoreStatus(),
      tray: getTrayStatus(),
      engine: getEngineStatus(),
      telegram: getTelegramStatus(),
      checkedAt: nowIso()
    }));

    register("agendaJeff:background-start", async () => {
      if (deps.storeService && typeof deps.storeService.setBackgroundRunning === "function") {
        deps.storeService.setBackgroundRunning(true);
      }
      if (deps.trayService && typeof deps.trayService.createTray === "function") {
        deps.trayService.createTray();
      }
      if (deps.reminderEngineService && typeof deps.reminderEngineService.resume === "function") {
        deps.reminderEngineService.resume();
      }
      return { ok: true, mode: "electron", message: "Segundo plano activado.", status: getStoreStatus(), engine: getEngineStatus(), startedAt: nowIso() };
    });

    register("agendaJeff:background-stop", async () => {
      if (deps.reminderEngineService && typeof deps.reminderEngineService.pause === "function") {
        deps.reminderEngineService.pause();
      }
      return { ok: true, mode: "electron", message: "Segundo plano pausado.", status: getStoreStatus(), engine: getEngineStatus(), stoppedAt: nowIso() };
    });

    register("agendaJeff:background-check-now", async () => {
      if (!deps.reminderEngineService || typeof deps.reminderEngineService.checkNow !== "function") {
        return { ok: false, message: "Motor de recordatorios no disponible." };
      }
      return deps.reminderEngineService.checkNow("manual");
    });

    register("agendaJeff:background-sync-settings", async (payload) => {
      if (!deps.storeService || typeof deps.storeService.saveNotificationSettings !== "function") {
        return { ok: false, message: "Store de segundo plano no disponible." };
      }
      const state = deps.storeService.saveNotificationSettings(payload.settings || payload);
      return { ok: true, mode: "electron", message: "Configuración sincronizada con Electron.", notifications: state.notifications, syncedAt: nowIso() };
    });

    register("agendaJeff:background-sync-reminders", async (payload) => {
      if (!deps.storeService || typeof deps.storeService.saveReminders !== "function") {
        return { ok: false, message: "Store de segundo plano no disponible." };
      }
      const state = deps.storeService.saveReminders(payload.reminders || []);
      return { ok: true, mode: "electron", message: "Recordatorios sincronizados con Electron.", total: state.reminders.length, syncedAt: nowIso() };
    });

    register("agendaJeff:background-add-reminder", async (payload) => {
      if (!deps.storeService || typeof deps.storeService.appendReminder !== "function") {
        return { ok: false, message: "Store de segundo plano no disponible." };
      }
      const state = deps.storeService.appendReminder(payload.reminder || payload);
      return { ok: true, mode: "electron", message: "Recordatorio agregado al segundo plano.", total: state.reminders.length, addedAt: nowIso() };
    });

    register("agendaJeff:telegram-sync", async (payload) => {
      if (!deps.storeService || typeof deps.storeService.saveTelegramConfig !== "function") {
        return { ok: false, message: "Store de segundo plano no disponible." };
      }
      const state = deps.storeService.saveTelegramConfig(payload);
      return {
        ok: true,
        mode: "electron",
        message: "Configuración de Telegram sincronizada con segundo plano.",
        telegram: {
          enabled: Boolean(state.telegram.enabled),
          configured: Boolean(state.telegram.configured),
          hasBotToken: Boolean(state.telegram.botToken),
          hasChatId: Boolean(state.telegram.chatId),
          username: state.telegram.username || ""
        },
        syncedAt: nowIso()
      };
    });

    register("agendaJeff:telegram-send", async (payload) => {
      if (!deps.telegramService || typeof deps.telegramService.sendMessage !== "function") {
        return { ok: false, message: "Servicio Telegram de segundo plano no disponible." };
      }
      return deps.telegramService.sendMessage(payload);
    });

    register("agendaJeff:test-telegram", async () => {
      if (!deps.telegramService || typeof deps.telegramService.testMessage !== "function") {
        return { ok: false, message: "Servicio Telegram de segundo plano no disponible." };
      }
      return deps.telegramService.testMessage();
    });

    register("agendaJeff:test-notification", async (payload) => {
      if (!deps.notificationService || typeof deps.notificationService.test !== "function") {
        return { ok: false, message: "Servicio de notificaciones no disponible." };
      }
      return deps.notificationService.test(payload);
    });

    register("agendaJeff:test-background", async (payload) => {
      if (deps.storeService && typeof deps.storeService.setBackgroundRunning === "function") deps.storeService.setBackgroundRunning(true);
      if (deps.trayService && typeof deps.trayService.createTray === "function") deps.trayService.createTray();
      if (deps.reminderEngineService && typeof deps.reminderEngineService.resume === "function") deps.reminderEngineService.resume();
      const notification = deps.notificationService && typeof deps.notificationService.testBackground === "function"
        ? deps.notificationService.testBackground(payload)
        : null;
      return { ok: true, mode: "electron", message: "AgendaJeff está preparado para trabajar en segundo plano.", notification, status: getStoreStatus(), engine: getEngineStatus(), testedAt: nowIso() };
    });

    register("agendaJeff:test-reminder", async (payload) => {
      const reminder = payload.reminder || payload;
      if (deps.storeService && typeof deps.storeService.appendReminder === "function") deps.storeService.appendReminder(reminder);
      const notification = deps.notificationService && typeof deps.notificationService.testReminder === "function"
        ? deps.notificationService.testReminder(reminder)
        : null;
      return { ok: true, mode: "electron", message: "Recordatorio de prueba procesado por Electron.", reminder, notification, testedAt: nowIso() };
    });

    register("agendaJeff:test-tray", async () => {
      if (!deps.trayService || typeof deps.trayService.testTrayIcon !== "function") return { ok: false, message: "Servicio Tray no disponible." };
      return deps.trayService.testTrayIcon();
    });

    register("agendaJeff:test-tray-menu", async () => {
      if (!deps.trayService || typeof deps.trayService.testTrayMenu !== "function") return { ok: false, message: "Servicio Tray no disponible." };
      return deps.trayService.testTrayMenu();
    });

    register("agendaJeff:minimize-to-tray", async () => {
      if (!deps.trayService || typeof deps.trayService.hideMainWindow !== "function") return { ok: false, message: "Servicio Tray no disponible." };
      if (typeof deps.trayService.createTray === "function") deps.trayService.createTray();
      return deps.trayService.hideMainWindow();
    });

    register("agendaJeff:show-window", async () => {
      if (!deps.trayService || typeof deps.trayService.showMainWindow !== "function") return { ok: false, message: "Servicio Tray no disponible." };
      return deps.trayService.showMainWindow();
    });

    register("agendaJeff:quit-app", async () => {
      if (deps.trayService && typeof deps.trayService.quitApp === "function") return deps.trayService.quitApp();
      if (typeof deps.requestQuit === "function") deps.requestQuit();
      return { ok: true, message: "Cerrando AgendaJeff completamente.", quitAt: nowIso() };
    });

    return { ok: true, message: "Canales IPC de segundo plano registrados.", channels: Array.from(registeredChannels), registeredAt: nowIso() };
  }

  return {
    registerHandlers,
    getRegisteredChannels() {
      return Array.from(registeredChannels);
    }
  };
}

module.exports = createBackgroundIpcService;
