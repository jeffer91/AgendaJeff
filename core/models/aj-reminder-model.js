/*
  Nombre completo: aj-reminder-model.js
  Ruta: core/models/aj-reminder-model.js

  Función:
    - Preparar reglas base de recordatorio para AgendaJeff.
    - Este archivo deja el contrato listo para el programador de segundo plano.
*/

"use strict";

const { CORE_CONFIG } = require("../config/aj-core-config");

function getReminderHoursForItem(item) {
  const data = item && typeof item === "object" ? item : {};
  const reminders = data.recordatorios && typeof data.recordatorios === "object" ? data.recordatorios : {};

  if (data.tipo === CORE_CONFIG.types.PENDIENTE) {
    return Array.isArray(reminders.horasPendiente) && reminders.horasPendiente.length
      ? reminders.horasPendiente
      : CORE_CONFIG.defaultReminders.horasPendiente.slice();
  }

  if (data.todoDia || !data.horaInicio) {
    return Array.isArray(reminders.horasSinHora) && reminders.horasSinHora.length
      ? reminders.horasSinHora
      : CORE_CONFIG.defaultReminders.horasSinHora.slice();
  }

  return [data.horaInicio];
}

function summarizeReminderRules(item) {
  const data = item && typeof item === "object" ? item : {};

  return {
    tipo: data.tipo || CORE_CONFIG.types.EVENTO,
    horas: getReminderHoursForItem(data),
    cincoDiasAntes: Boolean(data.recordatorios && data.recordatorios.cincoDiasAntes),
    tresDiasAntes: Boolean(data.recordatorios && data.recordatorios.tresDiasAntes),
    unDiaAntes: Boolean(data.recordatorios && data.recordatorios.unDiaAntes),
    mismoDia: Boolean(!data.recordatorios || data.recordatorios.mismoDia !== false),
    usarDiasLaborables: Boolean(data.recordatorios && data.recordatorios.usarDiasLaborables)
  };
}

module.exports = Object.freeze({ getReminderHoursForItem, summarizeReminderRules });
