/*
  Nombre completo: bg-store.service.js
  Ruta: electron/background/bg-store.service.js

  Función:
    - Guardar datos livianos del segundo plano en un JSON interno de Electron.
    - Mantener recordatorios, configuración de Telegram y estado del motor.
    - No depender de localStorage cuando la ventana está cerrada u oculta.
*/

"use strict";

const fs = require("fs");
const path = require("path");

function createBackgroundStoreService(app, config) {
  const CONFIG = config || {};
  const fileName = CONFIG.memory && CONFIG.memory.backgroundStoreFile
    ? CONFIG.memory.backgroundStoreFile
    : "background-store.json";
  const storeFile = path.join(app.getPath("userData"), fileName);

  const defaultState = {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: "",
    background: {
      enabled: true,
      paused: false,
      startedAt: "",
      stoppedAt: "",
      lastCheckAt: "",
      lastErrorMessage: ""
    },
    notifications: {
      enabled: true,
      desktopNotificationsEnabled: true,
      trayEnabled: true,
      remindersEnabled: true
    },
    telegram: {
      enabled: false,
      configured: false,
      botToken: "",
      chatId: "",
      username: "",
      updatedAt: ""
    },
    reminders: [],
    sent: {},
    meta: {
      storeFile
    }
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function ensureDir() {
    const dir = path.dirname(storeFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function mergeDeep(target, source) {
    const output = isPlainObject(target) ? { ...target } : {};

    if (!isPlainObject(source)) {
      return output;
    }

    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (Array.isArray(sourceValue)) {
        output[key] = sourceValue.slice();
        return;
      }

      if (isPlainObject(sourceValue)) {
        output[key] = mergeDeep(targetValue, sourceValue);
        return;
      }

      output[key] = sourceValue;
    });

    return output;
  }

  function normalizeState(rawState) {
    const state = mergeDeep(defaultState, isPlainObject(rawState) ? rawState : {});
    state.version = 1;
    state.updatedAt = state.updatedAt || "";
    state.reminders = Array.isArray(state.reminders) ? state.reminders : [];
    state.sent = isPlainObject(state.sent) ? state.sent : {};
    state.meta = mergeDeep(state.meta, { storeFile });
    return state;
  }

  function writeState(state) {
    ensureDir();
    const normalized = normalizeState(state);
    normalized.updatedAt = nowIso();
    fs.writeFileSync(storeFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    return normalized;
  }

  function readState() {
    ensureDir();

    if (!fs.existsSync(storeFile)) {
      return writeState(defaultState);
    }

    try {
      return normalizeState(JSON.parse(fs.readFileSync(storeFile, "utf8")));
    } catch (error) {
      try {
        fs.copyFileSync(storeFile, `${storeFile}.corrupt-${Date.now()}.bak`);
      } catch (_copyError) {
        // No bloquear la app si no puede respaldar.
      }

      const cleanState = normalizeState(defaultState);
      cleanState.background.lastErrorMessage = `Store regenerado: ${error.message}`;
      return writeState(cleanState);
    }
  }

  function patchState(partialState) {
    return writeState(mergeDeep(readState(), partialState || {}));
  }

  function getStatus() {
    const state = readState();
    return {
      ok: true,
      storeFile,
      background: state.background,
      notifications: state.notifications,
      telegram: {
        enabled: Boolean(state.telegram.enabled),
        configured: Boolean(state.telegram.configured),
        hasBotToken: Boolean(state.telegram.botToken),
        hasChatId: Boolean(state.telegram.chatId),
        username: state.telegram.username || "",
        updatedAt: state.telegram.updatedAt || ""
      },
      reminders: {
        total: state.reminders.length,
        pending: state.reminders.filter((item) => item && item.id && !state.sent[item.id]).length,
        sent: Object.keys(state.sent).length
      },
      updatedAt: state.updatedAt
    };
  }

  function saveNotificationSettings(settings) {
    return patchState({
      notifications: {
        ...(settings || {}),
        enabled: settings && settings.enabled === false ? false : true,
        updatedAt: nowIso()
      }
    });
  }

  function saveTelegramConfig(configPayload) {
    const payload = configPayload || {};
    const botToken = String(payload.botToken || payload.token || "").trim();
    const chatId = String(payload.chatId || payload.chatID || "").trim();

    return patchState({
      telegram: {
        enabled: Boolean(botToken && chatId),
        configured: Boolean(botToken && chatId),
        botToken,
        chatId,
        username: String(payload.username || payload.botUsername || "").trim(),
        updatedAt: nowIso()
      }
    });
  }

  function readTelegramConfig() {
    return readState().telegram;
  }

  function normalizeReminder(reminder, index) {
    const item = reminder && typeof reminder === "object" ? reminder : {};
    const id = String(item.id || `reminder-${Date.now()}-${index}`).trim();

    return {
      ...item,
      id,
      title: String(item.title || item.itemTitle || "Recordatorio AgendaJeff").trim(),
      body: String(item.body || item.description || item.message || "Tienes un recordatorio pendiente.").trim(),
      reminderAt: String(item.reminderAt || item.triggerAt || item.dateTime || "").trim(),
      channels: Array.isArray(item.channels) ? item.channels : ["desktopNotifications"],
      updatedAt: nowIso()
    };
  }

  function saveReminders(reminders) {
    const normalized = (Array.isArray(reminders) ? reminders : [])
      .filter((item) => item && typeof item === "object")
      .map(normalizeReminder);

    return patchState({ reminders: normalized });
  }

  function appendReminder(reminder) {
    const state = readState();
    const nextReminder = normalizeReminder(reminder, 0);
    const reminders = state.reminders.filter((item) => item.id !== nextReminder.id);
    reminders.push(nextReminder);
    return patchState({ reminders });
  }

  function markReminderSent(reminderId, result) {
    const id = String(reminderId || "").trim();
    if (!id) return readState();

    const state = readState();
    return patchState({
      sent: {
        ...state.sent,
        [id]: {
          sentAt: nowIso(),
          result: result || {}
        }
      }
    });
  }

  function clearSentHistory() {
    return patchState({ sent: {} });
  }

  function setBackgroundRunning(isRunning) {
    return patchState({
      background: {
        enabled: Boolean(isRunning),
        paused: false,
        startedAt: isRunning ? nowIso() : readState().background.startedAt,
        stoppedAt: isRunning ? "" : nowIso()
      }
    });
  }

  function setBackgroundPaused(isPaused) {
    return patchState({
      background: {
        paused: Boolean(isPaused)
      }
    });
  }

  function touchBackgroundCheck(errorMessage) {
    return patchState({
      background: {
        lastCheckAt: nowIso(),
        lastErrorMessage: errorMessage ? String(errorMessage) : ""
      }
    });
  }

  return {
    storeFile,
    readState,
    writeState,
    patchState,
    getStatus,
    saveNotificationSettings,
    saveTelegramConfig,
    readTelegramConfig,
    saveReminders,
    appendReminder,
    markReminderSent,
    clearSentHistory,
    setBackgroundRunning,
    setBackgroundPaused,
    touchBackgroundCheck
  };
}

module.exports = createBackgroundStoreService;
