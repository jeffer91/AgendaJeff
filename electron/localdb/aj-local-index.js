/*
  Nombre completo: aj-local-index.js
  Ruta: electron/localdb/aj-local-index.js

  Función:
    - Consultar, insertar, actualizar, completar y eliminar registros en la base local.
*/

"use strict";

const { readLocalData } = require("./aj-local-read");
const { saveLocalData } = require("./aj-local-save");
const { normalizeAgendaItem } = require("../../core/models/aj-event-model");
const { pushSyncQueue } = require("../../core/models/aj-sync-model");
const { CORE_CONFIG } = require("../../core/config/aj-core-config");
const { todayIsoDate, isDateBetween } = require("../../core/utils/aj-date");
const { createOk, createError } = require("../../core/utils/aj-result");

function sortItems(items) {
  return items.slice().sort(function sortByDate(a, b) {
    const dateCompare = String(a.fechaInicio || "").localeCompare(String(b.fechaInicio || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""));
  });
}

function filterItems(items, filters) {
  const opts = filters && typeof filters === "object" ? filters : {};
  const today = opts.today || todayIsoDate();
  let result = Array.isArray(items) ? items.slice() : [];

  if (opts.view === "today") {
    result = result.filter(function filterToday(item) { return item.fechaInicio === today; });
  }

  if (opts.view === "upcoming") {
    result = result.filter(function filterUpcoming(item) {
      return item.fechaInicio && item.fechaInicio >= today && item.estado !== CORE_CONFIG.states.COMPLETADO && item.estado !== CORE_CONFIG.states.CANCELADO;
    });
  }

  if (opts.view === "pending") {
    result = result.filter(function filterPending(item) {
      return item.tipo === CORE_CONFIG.types.PENDIENTE && item.estado !== CORE_CONFIG.states.COMPLETADO && item.estado !== CORE_CONFIG.states.CANCELADO;
    });
  }

  if (opts.tipo) result = result.filter(function filterType(item) { return item.tipo === opts.tipo; });
  if (opts.estado) result = result.filter(function filterState(item) { return item.estado === opts.estado; });
  if (opts.dateFrom || opts.dateTo) result = result.filter(function filterRange(item) { return isDateBetween(item.fechaInicio, opts.dateFrom, opts.dateTo); });

  return sortItems(result);
}

function queryLocalItems(appInstance, filters) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  const data = readResult.data.data;
  const items = filterItems(data.items, filters);

  return createOk("Consulta local ejecutada correctamente.", { items, total: items.length, filters: filters || {} }, { action: "localQuery", source: "electron-localdb" });
}

function upsertLocalItem(appInstance, input) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  try {
    const data = readResult.data.data;
    const item = normalizeAgendaItem(input, { categories: data.categories });
    const existingIndex = data.items.findIndex(function findItem(current) { return current.idLocal === item.idLocal; });
    const action = existingIndex >= 0 ? "update" : "create";

    if (existingIndex >= 0) data.items[existingIndex] = item;
    else data.items.push(item);

    pushSyncQueue(data, action, item);

    const saveResult = saveLocalData(appInstance, data);
    if (!saveResult.ok) return saveResult;

    return createOk("Registro guardado localmente y enviado a cola de sincronización.", { item, action, data }, { action: "localUpsert", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudo guardar el registro local.", { message: error.message }, { action: "localUpsert", source: "electron-localdb" });
  }
}

function markLocalItemCompleted(appInstance, idLocal) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  const data = readResult.data.data;
  const index = data.items.findIndex(function findItem(item) { return item.idLocal === idLocal; });

  if (index < 0) {
    return createError("No se encontró el registro para completar.", { message: "idLocal no existe." }, { action: "localComplete", source: "electron-localdb" });
  }

  data.items[index] = {
    ...data.items[index],
    estado: CORE_CONFIG.states.COMPLETADO,
    estadoSync: CORE_CONFIG.syncStates.PENDIENTE,
    auditoria: {
      ...(data.items[index].auditoria || {}),
      actualizadoEn: new Date().toISOString()
    }
  };

  pushSyncQueue(data, "complete", data.items[index]);
  const saveResult = saveLocalData(appInstance, data);
  if (!saveResult.ok) return saveResult;

  return createOk("Registro marcado como completado.", { item: data.items[index], data }, { action: "localComplete", source: "electron-localdb" });
}

function deleteLocalItem(appInstance, idLocal) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  const data = readResult.data.data;
  const index = data.items.findIndex(function findItem(item) { return item.idLocal === idLocal; });

  if (index < 0) {
    return createError("No se encontró el registro para eliminar.", { message: "idLocal no existe." }, { action: "localDelete", source: "electron-localdb" });
  }

  const item = {
    ...data.items[index],
    estado: CORE_CONFIG.states.CANCELADO,
    estadoSync: CORE_CONFIG.syncStates.PENDIENTE,
    auditoria: {
      ...(data.items[index].auditoria || {}),
      actualizadoEn: new Date().toISOString()
    }
  };

  data.items.splice(index, 1);
  pushSyncQueue(data, "delete", item);

  const saveResult = saveLocalData(appInstance, data);
  if (!saveResult.ok) return saveResult;

  return createOk("Registro eliminado localmente y enviado a cola de sincronización.", { item, data }, { action: "localDelete", source: "electron-localdb" });
}

module.exports = Object.freeze({ queryLocalItems, upsertLocalItem, markLocalItemCompleted, deleteLocalItem, filterItems });
