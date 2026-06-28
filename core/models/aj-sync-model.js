/*
  Nombre completo: aj-sync-model.js
  Ruta: core/models/aj-sync-model.js

  Función:
    - Crear elementos de cola de sincronización para Firebase, Google Calendar, Telegram y Notificaciones.
*/

"use strict";

const { createLocalId } = require("../utils/aj-id");

function createSyncQueueItem(action, target, item, extra) {
  const safeItem = item && typeof item === "object" ? item : {};

  return {
    idSync: createLocalId("sync"),
    action: action || "upsert",
    target: target || "all",
    idLocal: safeItem.idLocal || "",
    tipo: safeItem.tipo || "evento",
    status: "pendiente",
    attempts: 0,
    lastError: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: extra && typeof extra === "object" ? extra : {}
  };
}

function pushSyncQueue(data, action, item, targets) {
  const targetList = Array.isArray(targets) && targets.length ? targets : ["firebase", "googleCalendar", "telegram", "notificaciones"];
  const database = data && typeof data === "object" ? data : {};
  database.syncQueue = Array.isArray(database.syncQueue) ? database.syncQueue : [];

  targetList.forEach(function eachTarget(target) {
    database.syncQueue.push(createSyncQueueItem(action, target, item));
  });

  return database;
}

module.exports = Object.freeze({ createSyncQueueItem, pushSyncQueue });
