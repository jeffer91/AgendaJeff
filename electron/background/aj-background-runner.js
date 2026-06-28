/*
  Nombre completo: aj-background-runner.js
  Ruta: electron/background/aj-background-runner.js

  Función:
    - Mantener AgendaJeff activo en segundo plano.
    - Revisar recordatorios con bajo consumo.
    - Enviar notificaciones nativas cuando corresponda.
*/

"use strict";

const { readLocalData } = require("../localdb/aj-local-read");
const { getDueReminders } = require("./aj-background-reminders");
const { createScheduler } = require("./aj-background-scheduler");

function createBackgroundRunner(options) {
  const config = options && typeof options === "object" ? options : {};
  const appInstance = config.app;
  const sendNotification = typeof config.sendNotification === "function" ? config.sendNotification : function noop() { return { ok: false }; };
  const state = {
    running: false,
    paused: false,
    startedAt: "",
    stoppedAt: "",
    lastRunAt: "",
    nextRunAt: "",
    lastResult: null,
    notifiedKeys: new Set(),
    intervalMs: Number(config.intervalMs || 60000)
  };

  let scheduler = null;

  function toPlainStatus() {
    return {
      running: state.running,
      paused: state.paused,
      startedAt: state.startedAt,
      stoppedAt: state.stoppedAt,
      lastRunAt: state.lastRunAt,
      nextRunAt: state.nextRunAt,
      intervalMs: state.intervalMs,
      notifiedCount: state.notifiedKeys.size,
      lastResult: state.lastResult
    };
  }

  function buildResult(ok, message, data) {
    return {
      ok: Boolean(ok),
      action: "backgroundRunner",
      source: "electron-background",
      message: message || "",
      data: data || null,
      checkedAt: new Date().toISOString()
    };
  }

  function scheduleNextRun() {
    state.nextRunAt = new Date(Date.now() + state.intervalMs).toISOString();
  }

  async function checkNow(reason) {
    if (state.paused) {
      state.lastResult = buildResult(true, "Segundo plano pausado.", { reason: reason || "manual", reminders: [] });
      return state.lastResult;
    }

    state.lastRunAt = new Date().toISOString();
    scheduleNextRun();

    const readResult = readLocalData(appInstance);
    if (!readResult.ok || !readResult.data || !readResult.data.data) {
      state.lastResult = buildResult(false, "No se pudo leer la base local para recordatorios.", { readResult });
      return state.lastResult;
    }

    const items = Array.isArray(readResult.data.data.items) ? readResult.data.data.items : [];
    const reminders = getDueReminders(items, new Date(), state.notifiedKeys);
    const sent = [];

    reminders.forEach(function eachReminder(reminder) {
      const result = sendNotification(reminder.notification);
      if (result && result.ok) state.notifiedKeys.add(reminder.key);
      sent.push({ key: reminder.key, label: reminder.label, result });
    });

    state.lastResult = buildResult(true, "Revisión de segundo plano ejecutada.", {
      reason: reason || "interval",
      totalItems: items.length,
      dueReminders: reminders.length,
      sent
    });

    return state.lastResult;
  }

  function start() {
    if (state.running) return buildResult(true, "Segundo plano ya estaba activo.", toPlainStatus());

    state.running = true;
    state.paused = false;
    state.startedAt = new Date().toISOString();
    state.stoppedAt = "";
    scheduleNextRun();

    scheduler = createScheduler({ intervalMs: state.intervalMs, onTick: function onTick() { checkNow("interval"); } });
    scheduler.start();
    setTimeout(function firstCheck() { checkNow("startup"); }, 2500);

    return buildResult(true, "Segundo plano iniciado.", toPlainStatus());
  }

  function stop() {
    if (scheduler) scheduler.stop();
    scheduler = null;
    state.running = false;
    state.paused = false;
    state.stoppedAt = new Date().toISOString();
    state.nextRunAt = "";
    return buildResult(true, "Segundo plano detenido.", toPlainStatus());
  }

  function pause() {
    state.paused = true;
    return buildResult(true, "Segundo plano pausado.", toPlainStatus());
  }

  function resume() {
    state.paused = false;
    if (!state.running) start();
    return buildResult(true, "Segundo plano reanudado.", toPlainStatus());
  }

  function clearNotifiedKeys() {
    state.notifiedKeys.clear();
    return buildResult(true, "Historial de notificaciones en memoria limpiado.", toPlainStatus());
  }

  function status() {
    return buildResult(true, "Estado de segundo plano.", toPlainStatus());
  }

  return Object.freeze({ start, stop, pause, resume, checkNow, clearNotifiedKeys, status });
}

module.exports = Object.freeze({ createBackgroundRunner });
