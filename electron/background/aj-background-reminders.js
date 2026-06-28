/*
  Nombre completo: aj-background-reminders.js
  Ruta: electron/background/aj-background-reminders.js

  Función:
    - Detectar recordatorios vencidos o próximos para notificar en segundo plano.
    - Trabajar con bajo consumo revisando por ventanas de minutos, no cada segundo.
*/

"use strict";

const { isActivePending, getPendingReminderTimes, isCompletedOrCancelled } = require("./aj-background-pending");

function pad(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toHHMM(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return toIsoDate(date);
}

function minutesFromHHMM(timeText) {
  const match = String(timeText || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isTimeDue(now, targetTime, windowMinutes) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = minutesFromHHMM(targetTime);
  const tolerance = Number(windowMinutes || 5);
  if (targetMinutes === null) return false;
  return nowMinutes >= targetMinutes && nowMinutes <= targetMinutes + tolerance;
}

function getAllDayTimes(item) {
  const reminders = item && item.recordatorios && typeof item.recordatorios === "object" ? item.recordatorios : {};
  return Array.isArray(reminders.horasSinHora) && reminders.horasSinHora.length ? reminders.horasSinHora : ["06:00", "13:00", "17:00"];
}

function buildNotificationKey(item, targetDate, targetTime, type) {
  return [item.idLocal || item.titulo || "sin-id", targetDate, targetTime, type].join("|");
}

function buildReminder(item, targetDate, targetTime, type, label) {
  const timeLabel = item.todoDia || !item.horaInicio ? "sin hora" : item.horaFin ? `${item.horaInicio} - ${item.horaFin}` : item.horaInicio;
  const title = type === "pending" ? "AgendaJeff · Pendiente" : "AgendaJeff · Recordatorio";
  const body = `${item.titulo || "Registro"} · ${item.fechaInicio || targetDate} · ${timeLabel}`;

  return {
    key: buildNotificationKey(item, targetDate, targetTime, type),
    type,
    label,
    targetDate,
    targetTime,
    item,
    notification: {
      title,
      body,
      silent: false,
      type: "background-reminder"
    }
  };
}

function pushIfDue(output, item, now, targetDate, targetTime, type, label, alreadyNotified) {
  const today = toIsoDate(now);
  if (targetDate !== today) return;
  if (!isTimeDue(now, targetTime, 5)) return;

  const reminder = buildReminder(item, targetDate, targetTime, type, label);
  if (alreadyNotified && alreadyNotified.has(reminder.key)) return;
  output.push(reminder);
}

function collectPendingReminders(output, item, now, alreadyNotified) {
  if (!isActivePending(item)) return;

  const today = toIsoDate(now);
  const itemDate = item.fechaInicio || today;
  if (itemDate > today) return;

  getPendingReminderTimes(item).forEach(function eachTime(time) {
    pushIfDue(output, item, now, today, time, "pending", "Pendiente activo", alreadyNotified);
  });
}

function collectEventReminders(output, item, now, alreadyNotified) {
  if (!item || isCompletedOrCancelled(item)) return;
  if (item.tipo === "pendiente") return;
  if (!item.fechaInicio) return;

  const reminders = item.recordatorios && typeof item.recordatorios === "object" ? item.recordatorios : {};
  const sameDayTimes = item.todoDia || !item.horaInicio ? getAllDayTimes(item) : [item.horaInicio];

  if (reminders.cincoDiasAntes !== false) {
    pushIfDue(output, item, now, addDays(item.fechaInicio, -5), "08:00", "event-5d", "5 días antes", alreadyNotified);
  }

  if (reminders.tresDiasAntes !== false) {
    pushIfDue(output, item, now, addDays(item.fechaInicio, -3), "08:00", "event-3d", "3 días antes", alreadyNotified);
  }

  if (reminders.unDiaAntes !== false) {
    pushIfDue(output, item, now, addDays(item.fechaInicio, -1), "08:00", "event-1d", "1 día antes", alreadyNotified);
  }

  if (reminders.mismoDia !== false) {
    sameDayTimes.forEach(function eachSameDayTime(time) {
      pushIfDue(output, item, now, item.fechaInicio, time, "event-same-day", "Mismo día", alreadyNotified);
    });
  }
}

function getDueReminders(items, nowDate, alreadyNotified) {
  const now = nowDate instanceof Date ? nowDate : new Date();
  const output = [];
  const list = Array.isArray(items) ? items : [];

  list.forEach(function eachItem(item) {
    collectPendingReminders(output, item, now, alreadyNotified);
    collectEventReminders(output, item, now, alreadyNotified);
  });

  return output;
}

module.exports = Object.freeze({ getDueReminders, toIsoDate, toHHMM, isTimeDue });
