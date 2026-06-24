/*
  Nombre completo: bg-reminder-engine.service.js
  Ruta: electron/background/bg-reminder-engine.service.js

  Función:
    - Revisar recordatorios pendientes en segundo plano.
    - Enviar notificación nativa y Telegram cuando corresponda.
    - Marcar avisos como enviados para evitar duplicados.
*/

"use strict";

function createBackgroundReminderEngineService(config, dependencies) {
  const CONFIG = config || {};
  const deps = dependencies || {};

  if (!deps.storeService) {
    throw new Error("bg-reminder-engine.service.js requiere storeService.");
  }

  let timer = null;
  let running = false;
  let checking = false;
  let lastRunResult = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function getIntervalMs() {
    const requested = Number(CONFIG.background && CONFIG.background.checkIntervalMs) || 60000;
    const minimum = Number(CONFIG.background && CONFIG.background.minimumCheckIntervalMs) || 15000;
    return Math.max(requested, minimum);
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getReminderDate(reminder) {
    const item = reminder || {};
    const rawDate = normalizeText(item.reminderAt || item.triggerAt || item.dateTime || item.dueAt);
    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function hasChannel(reminder, channel) {
    const channels = Array.isArray(reminder && reminder.channels) ? reminder.channels : [];
    return channels.includes(channel);
  }

  function isDue(reminder, nowMs) {
    const reminderDate = getReminderDate(reminder);
    return Boolean(reminderDate && reminderDate.getTime() <= nowMs);
  }

  function getPendingDueReminders(state) {
    const reminders = Array.isArray(state && state.reminders) ? state.reminders : [];
    const sent = state && state.sent && typeof state.sent === "object" ? state.sent : {};
    const nowMs = Date.now();
    const limit = Number(CONFIG.background && CONFIG.background.maxNotificationItemsPerCycle) || 10;

    return reminders
      .filter((reminder) => reminder && reminder.id)
      .filter((reminder) => !sent[reminder.id])
      .filter((reminder) => isDue(reminder, nowMs))
      .slice(0, limit);
  }

  function buildDesktopPayload(reminder) {
    const item = reminder || {};
    return {
      title: normalizeText(item.title || item.itemTitle || "Recordatorio AgendaJeff"),
      body: normalizeText(item.body || item.description || item.message || item.label || "Tienes un recordatorio pendiente."),
      tag: normalizeText(item.id),
      source: "background-reminder-engine"
    };
  }

  async function deliverReminder(reminder) {
    const results = {
      id: reminder.id,
      desktop: null,
      telegram: null,
      deliveredAt: nowIso()
    };

    if (deps.notificationService && typeof deps.notificationService.send === "function") {
      try {
        results.desktop = deps.notificationService.send(buildDesktopPayload(reminder));
      } catch (error) {
        results.desktop = { ok: false, message: error.message };
      }
    }

    if (
      hasChannel(reminder, "telegram") &&
      deps.telegramService &&
      typeof deps.telegramService.hasValidConnection === "function" &&
      deps.telegramService.hasValidConnection()
    ) {
      try {
        results.telegram = await deps.telegramService.sendReminder(reminder);
      } catch (error) {
        results.telegram = { ok: false, message: error.message };
      }
    }

    deps.storeService.markReminderSent(reminder.id, results);
    return results;
  }

  async function checkNow(reason) {
    if (checking) {
      return {
        ok: true,
        skipped: true,
        message: "La revisión anterior todavía está en curso.",
        checkedAt: nowIso()
      };
    }

    checking = true;

    try {
      const state = deps.storeService.readState();
      const background = state.background || {};

      if (!background.enabled || background.paused) {
        lastRunResult = {
          ok: true,
          reason: reason || "manual",
          paused: Boolean(background.paused),
          enabled: Boolean(background.enabled),
          due: 0,
          sent: 0,
          checkedAt: nowIso()
        };
        deps.storeService.touchBackgroundCheck("");
        return lastRunResult;
      }

      const dueReminders = getPendingDueReminders(state);
      const delivered = [];

      for (const reminder of dueReminders) {
        delivered.push(await deliverReminder(reminder));
      }

      lastRunResult = {
        ok: true,
        reason: reason || "interval",
        due: dueReminders.length,
        sent: delivered.length,
        delivered,
        checkedAt: nowIso()
      };
      deps.storeService.touchBackgroundCheck("");
      return lastRunResult;
    } catch (error) {
      deps.storeService.touchBackgroundCheck(error.message);
      lastRunResult = { ok: false, message: error.message, checkedAt: nowIso() };
      return lastRunResult;
    } finally {
      checking = false;
    }
  }

  function start() {
    if (running) return getStatus();
    running = true;
    deps.storeService.setBackgroundRunning(true);

    timer = setInterval(() => {
      checkNow("interval").catch(() => {});
    }, getIntervalMs());

    if (timer && typeof timer.unref === "function") {
      timer.unref();
    }

    checkNow("start").catch(() => {});
    return getStatus();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    running = false;
    deps.storeService.setBackgroundPaused(true);
    return getStatus();
  }

  function resume() {
    deps.storeService.setBackgroundPaused(false);
    if (!running) return start();
    return getStatus();
  }

  function pause() {
    deps.storeService.setBackgroundPaused(true);
    return getStatus();
  }

  function getStatus() {
    return {
      ok: true,
      running,
      intervalMs: getIntervalMs(),
      checking,
      lastRunResult,
      store: deps.storeService.getStatus(),
      checkedAt: nowIso()
    };
  }

  return {
    start,
    stop,
    pause,
    resume,
    checkNow,
    getStatus,
    getPendingDueReminders
  };
}

module.exports = createBackgroundReminderEngineService;
