/*
  Nombre completo: preload.js
  Ruta: electron/preload.js

  Función:
    - Crear un puente seguro entre Electron y la app web.
    - Exponer funciones mínimas y controladas hacia index.html y módulos en iframe.
    - Permitir controlar segundo plano, bandeja, notificaciones, Telegram y recordatorios.
    - No exponer Node.js directamente a las pantallas internas.
*/

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function invokeSafe(channel, payload) {
  return ipcRenderer.invoke(channel, payload || {});
}

const AgendaJeffElectron = {
  isElectron: true,
  platform: process.platform,

  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },

  app: {
    getInfo() {
      return invokeSafe("agendaJeff:app-info");
    },

    reload() {
      return invokeSafe("agendaJeff:reload-window");
    },

    minimize() {
      return invokeSafe("agendaJeff:minimize-window");
    },

    maximizeOrRestore() {
      return invokeSafe("agendaJeff:maximize-or-restore-window");
    },

    close() {
      return invokeSafe("agendaJeff:close-window");
    },

    show() {
      return invokeSafe("agendaJeff:show-window");
    },

    quit() {
      return invokeSafe("agendaJeff:quit-app");
    }
  },

  menu: {
    getLastSnapshot() {
      return invokeSafe("agendaJeff:get-menu-snapshot");
    },

    saveLastSnapshot(snapshot) {
      return invokeSafe("agendaJeff:save-menu-snapshot", snapshot || {});
    }
  },

  background: {
    getStatus() {
      return invokeSafe("agendaJeff:background-status");
    },

    start(payload) {
      return invokeSafe("agendaJeff:background-start", payload || {});
    },

    stop(payload) {
      return invokeSafe("agendaJeff:background-stop", payload || {});
    },

    checkNow(payload) {
      return invokeSafe("agendaJeff:background-check-now", payload || {});
    },

    syncSettings(settings) {
      return invokeSafe("agendaJeff:background-sync-settings", { settings: settings || {} });
    },

    syncReminders(reminders) {
      return invokeSafe("agendaJeff:background-sync-reminders", { reminders: reminders || [] });
    },

    addReminder(reminder) {
      return invokeSafe("agendaJeff:background-add-reminder", { reminder: reminder || {} });
    },

    test(payload) {
      return invokeSafe("agendaJeff:test-background", payload || {});
    }
  },

  notifications: {
    show(payload) {
      return invokeSafe("agendaJeff:test-notification", payload || {});
    },

    test(payload) {
      return invokeSafe("agendaJeff:test-notification", payload || {});
    },

    testReminder(payload) {
      return invokeSafe("agendaJeff:test-reminder", payload || {});
    }
  },

  tray: {
    testIcon(payload) {
      return invokeSafe("agendaJeff:test-tray", payload || {});
    },

    testMenu(payload) {
      return invokeSafe("agendaJeff:test-tray-menu", payload || {});
    },

    minimizeToTray(payload) {
      return invokeSafe("agendaJeff:minimize-to-tray", payload || {});
    },

    showWindow(payload) {
      return invokeSafe("agendaJeff:show-window", payload || {});
    }
  },

  telegram: {
    sync(config) {
      return invokeSafe("agendaJeff:telegram-sync", config || {});
    },

    send(payload) {
      return invokeSafe("agendaJeff:telegram-send", payload || {});
    },

    test(payload) {
      return invokeSafe("agendaJeff:test-telegram", payload || {});
    }
  }
};

const agendaJeffNotifications = {
  getInfo() {
    return AgendaJeffElectron.app.getInfo();
  },

  getStatus() {
    return AgendaJeffElectron.background.getStatus();
  },

  showNotification(payload) {
    return AgendaJeffElectron.notifications.show(payload);
  },

  showWindowsToast(payload) {
    return AgendaJeffElectron.notifications.show(payload);
  },

  createTrayIcon(payload) {
    return AgendaJeffElectron.tray.testIcon(payload);
  },

  testTrayMenu(payload) {
    return AgendaJeffElectron.tray.testMenu(payload);
  },

  minimizeToTray(payload) {
    return AgendaJeffElectron.tray.minimizeToTray(payload);
  },

  testBackground(payload) {
    return AgendaJeffElectron.background.test(payload);
  },

  checkBackgroundNow(payload) {
    return AgendaJeffElectron.background.checkNow(payload);
  },

  testReminder(payload) {
    return AgendaJeffElectron.notifications.testReminder(payload);
  },

  startBackground(payload) {
    return AgendaJeffElectron.background.start(payload);
  },

  stopBackground(payload) {
    return AgendaJeffElectron.background.stop(payload);
  },

  syncSettings(settings) {
    return AgendaJeffElectron.background.syncSettings(settings);
  },

  syncReminders(reminders) {
    return AgendaJeffElectron.background.syncReminders(reminders);
  },

  syncTelegram(config) {
    return AgendaJeffElectron.telegram.sync(config);
  },

  sendTelegram(payload) {
    return AgendaJeffElectron.telegram.send(payload);
  },

  testTelegram(payload) {
    return AgendaJeffElectron.telegram.test(payload);
  }
};

contextBridge.exposeInMainWorld("AgendaJeffElectron", AgendaJeffElectron);
contextBridge.exposeInMainWorld("agendaJeffNotifications", agendaJeffNotifications);
contextBridge.exposeInMainWorld("agendaJeff", AgendaJeffElectron);
