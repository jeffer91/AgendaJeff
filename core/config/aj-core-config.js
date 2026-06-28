/*
  Nombre completo: aj-core-config.js
  Ruta: core/config/aj-core-config.js

  Función:
    - Centralizar constantes base del núcleo AgendaJeff.
    - Definir tipos, estados, canales y reglas iniciales para eventos, recordatorios y pendientes.
*/

"use strict";

const CORE_CONFIG = Object.freeze({
  app: Object.freeze({
    name: "AgendaJeff",
    schemaVersion: 1,
    dataVersion: "1.0.0"
  }),

  types: Object.freeze({
    EVENTO: "evento",
    RECORDATORIO: "recordatorio",
    PENDIENTE: "pendiente"
  }),

  states: Object.freeze({
    ACTIVO: "activo",
    PENDIENTE_SINCRONIZAR: "pendiente_sincronizar",
    SINCRONIZADO: "sincronizado",
    ERROR: "error",
    COMPLETADO: "completado",
    VENCIDO: "vencido",
    CANCELADO: "cancelado"
  }),

  syncStates: Object.freeze({
    PENDIENTE: "pendiente_sincronizar",
    SINCRONIZADO: "sincronizado",
    ERROR: "error"
  }),

  defaultChannels: Object.freeze({
    escritorio: true,
    telegram: true,
    googleCalendar: true
  }),

  defaultReminders: Object.freeze({
    cincoDiasAntes: true,
    tresDiasAntes: true,
    unDiaAntes: true,
    mismoDia: true,
    usarDiasLaborables: false,
    horasSinHora: Object.freeze(["06:00", "13:00", "17:00"]),
    horasPendiente: Object.freeze(["06:00", "17:00"])
  }),

  repeatTypes: Object.freeze({
    NONE: "none",
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly"
  })
});

module.exports = Object.freeze({ CORE_CONFIG });
