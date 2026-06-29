/*
  Nombre completo: aj-local-index.js
  Ruta: electron/localdb/aj-local-index.js

  Función:
    - Consultar, insertar, actualizar, completar y eliminar registros en la base local.
    - Depurar duplicados reales antes de mostrar, guardar y sincronizar.
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

function cleanForDuplicate(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function timeOnly(value) {
  return String(value || "").slice(0, 5);
}

function duplicateKey(item) {
  const safeItem = item && typeof item === "object" ? item : {};
  return [
    safeItem.tipo || CORE_CONFIG.types.EVENTO,
    cleanForDuplicate(safeItem.titulo || safeItem.actividad || ""),
    dateOnly(safeItem.fechaInicio),
    dateOnly(safeItem.fechaFin) || dateOnly(safeItem.fechaInicio),
    timeOnly(safeItem.horaInicio),
    timeOnly(safeItem.horaFin)
  ].join("|");
}

function activeForDuplicate(item) {
  return item && item.estado !== CORE_CONFIG.states.CANCELADO;
}

function findDuplicateIndex(items, item, excludeIdLocal) {
  const key = duplicateKey(item);
  if (!key.replace(/[|]/g, "")) return -1;
  return (Array.isArray(items) ? items : []).findIndex(function findDuplicate(current) {
    if (!activeForDuplicate(current)) return false;
    if (excludeIdLocal && current.idLocal === excludeIdLocal) return false;
    return duplicateKey(current) === key;
  });
}

function queueDuplicateDeletes(data, duplicates) {
  (Array.isArray(duplicates) ? duplicates : []).forEach(function queueDelete(duplicate) {
    const item = {
      ...duplicate,
      estado: CORE_CONFIG.states.CANCELADO,
      estadoSync: CORE_CONFIG.syncStates.PENDIENTE,
      auditoria: {
        ...(duplicate.auditoria || {}),
        actualizadoEn: new Date().toISOString()
      }
    };
    pushSyncQueue(data, "delete", item, ["firebase", "googleCalendar"]);
  });
}

function dedupeLocalData(data) {
  const database = data && typeof data === "object" ? data : {};
  const sourceItems = Array.isArray(database.items) ? database.items : [];
  const kept = [];
  const duplicates = [];
  const seen = new Set();

  sourceItems.forEach(function eachItem(item) {
    if (!activeForDuplicate(item)) {
      kept.push(item);
      return;
    }
    const key = duplicateKey(item);
    if (key.replace(/[|]/g, "") && seen.has(key)) {
      duplicates.push(item);
      return;
    }
    seen.add(key);
    kept.push(item);
  });

  if (duplicates.length) {
    database.items = kept;
    queueDuplicateDeletes(database, duplicates);
  }

  return {
    data: database,
    duplicatesRemoved: duplicates.length,
    duplicateIds: duplicates.map(function mapId(item) { return item.idLocal; })
  };
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
  const cleanup = dedupeLocalData(data);
  if (cleanup.duplicatesRemoved > 0) saveLocalData(appInstance, cleanup.data);

  const items = filterItems(cleanup.data.items, filters);

  return createOk("Consulta local ejecutada correctamente.", {
    items,
    total: items.length,
    filters: filters || {},
    duplicatesRemoved: cleanup.duplicatesRemoved,
    duplicateIds: cleanup.duplicateIds
  }, { action: "localQuery", source: "electron-localdb" });
}

function upsertLocalItem(appInstance, input) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  try {
    const data = readResult.data.data;
    const cleanup = dedupeLocalData(data);
    const item = normalizeAgendaItem(input, { categories: cleanup.data.categories });
    const existingIndex = cleanup.data.items.findIndex(function findItem(current) { return current.idLocal === item.idLocal; });
    const duplicateIndex = findDuplicateIndex(cleanup.data.items, item, item.idLocal);

    if (duplicateIndex >= 0 && existingIndex < 0) {
      const duplicate = cleanup.data.items[duplicateIndex];
      if (cleanup.duplicatesRemoved > 0) saveLocalData(appInstance, cleanup.data);
      return createError("Registro duplicado omitido. Ya existe un evento con la misma actividad, fecha y hora.", {
        message: "duplicate",
        duplicate: true,
        duplicateIdLocal: duplicate.idLocal,
        duplicatesRemoved: cleanup.duplicatesRemoved
      }, { action: "localUpsert", source: "electron-localdb" });
    }

    const action = existingIndex >= 0 ? "update" : "create";

    if (existingIndex >= 0) cleanup.data.items[existingIndex] = item;
    else cleanup.data.items.push(item);

    pushSyncQueue(cleanup.data, action, item);

    const saveResult = saveLocalData(appInstance, cleanup.data);
    if (!saveResult.ok) return saveResult;

    return createOk("Registro guardado localmente y enviado a cola de sincronización.", {
      item,
      action,
      data: cleanup.data,
      duplicatesRemoved: cleanup.duplicatesRemoved
    }, { action: "localUpsert", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudo guardar el registro local.", { message: error.message }, { action: "localUpsert", source: "electron-localdb" });
  }
}

function markLocalItemCompleted(appInstance, idLocal) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  const data = readResult.data.data;
  const cleanup = dedupeLocalData(data);
  const index = cleanup.data.items.findIndex(function findItem(item) { return item.idLocal === idLocal; });

  if (index < 0) {
    return createError("No se encontró el registro para completar.", { message: "idLocal no existe." }, { action: "localComplete", source: "electron-localdb" });
  }

  cleanup.data.items[index] = {
    ...cleanup.data.items[index],
    estado: CORE_CONFIG.states.COMPLETADO,
    estadoSync: CORE_CONFIG.syncStates.PENDIENTE,
    auditoria: {
      ...(cleanup.data.items[index].auditoria || {}),
      actualizadoEn: new Date().toISOString()
    }
  };

  pushSyncQueue(cleanup.data, "complete", cleanup.data.items[index]);
  const saveResult = saveLocalData(appInstance, cleanup.data);
  if (!saveResult.ok) return saveResult;

  return createOk("Registro marcado como completado.", { item: cleanup.data.items[index], data: cleanup.data }, { action: "localComplete", source: "electron-localdb" });
}

function deleteLocalItem(appInstance, idLocal) {
  const readResult = readLocalData(appInstance);
  if (!readResult.ok) return readResult;

  const data = readResult.data.data;
  const cleanup = dedupeLocalData(data);
  const index = cleanup.data.items.findIndex(function findItem(item) { return item.idLocal === idLocal; });

  if (index < 0) {
    return createError("No se encontró el registro para eliminar.", { message: "idLocal no existe." }, { action: "localDelete", source: "electron-localdb" });
  }

  const item = {
    ...cleanup.data.items[index],
    estado: CORE_CONFIG.states.CANCELADO,
    estadoSync: CORE_CONFIG.syncStates.PENDIENTE,
    auditoria: {
      ...(cleanup.data.items[index].auditoria || {}),
      actualizadoEn: new Date().toISOString()
    }
  };

  cleanup.data.items.splice(index, 1);
  pushSyncQueue(cleanup.data, "delete", item);

  const saveResult = saveLocalData(appInstance, cleanup.data);
  if (!saveResult.ok) return saveResult;

  return createOk("Registro eliminado localmente y enviado a cola de sincronización.", { item, data: cleanup.data }, { action: "localDelete", source: "electron-localdb" });
}

module.exports = Object.freeze({
  queryLocalItems,
  upsertLocalItem,
  markLocalItemCompleted,
  deleteLocalItem,
  filterItems,
  dedupeLocalData,
  duplicateKey
});