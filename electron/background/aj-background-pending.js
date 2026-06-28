/*
  Nombre completo: aj-background-pending.js
  Ruta: electron/background/aj-background-pending.js

  Función:
    - Reglas de pendientes para el segundo plano.
    - Un pendiente activo se sigue avisando todos los días hasta completarse.
*/

"use strict";

function isCompletedOrCancelled(item) {
  return item && (item.estado === "completado" || item.estado === "cancelado");
}

function isActivePending(item) {
  return Boolean(item && item.tipo === "pendiente" && !isCompletedOrCancelled(item));
}

function getPendingReminderTimes(item) {
  const reminders = item && item.recordatorios && typeof item.recordatorios === "object" ? item.recordatorios : {};
  return Array.isArray(reminders.horasPendiente) && reminders.horasPendiente.length ? reminders.horasPendiente : ["06:00", "17:00"];
}

module.exports = Object.freeze({ isActivePending, getPendingReminderTimes, isCompletedOrCancelled });
