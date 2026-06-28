/*
  Nombre completo: aj-local-defaults.js
  Ruta: electron/localdb/aj-local-defaults.js

  Función:
    - Crear estructura inicial de la base local JSON de AgendaJeff.
*/

"use strict";

const { CORE_CONFIG } = require("../../core/config/aj-core-config");
const { DEFAULT_CATEGORIES } = require("../../core/models/aj-category-model");

function createDefaultSettings() {
  return {
    runInBackground: true,
    askStartWindows: true,
    lowResourceMode: true,
    autoUpdate: true,
    confirmInstall: true,
    reminderHours: {
      allDay: CORE_CONFIG.defaultReminders.horasSinHora.slice(),
      pending: CORE_CONFIG.defaultReminders.horasPendiente.slice()
    },
    updatedAt: new Date().toISOString()
  };
}

function createDefaultData() {
  const now = new Date().toISOString();

  return {
    meta: {
      appName: CORE_CONFIG.app.name,
      schemaVersion: CORE_CONFIG.app.schemaVersion,
      dataVersion: CORE_CONFIG.app.dataVersion,
      createdAt: now,
      updatedAt: now
    },
    items: [],
    categories: DEFAULT_CATEGORIES.map(function cloneCategory(category) { return { ...category }; }),
    settings: createDefaultSettings(),
    syncQueue: []
  };
}

module.exports = Object.freeze({ createDefaultSettings, createDefaultData });
