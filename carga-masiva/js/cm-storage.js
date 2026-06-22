/*
  Nombre completo: cm-storage.js
  Ruta: carga-masiva/js/cm-storage.js

  Función:
    - Manejar almacenamiento local del módulo Carga Masiva.
    - Guardar configuración, lotes, eventos detectados y último lote.
    - Guardar borradores de revisión antes de importar.
    - Leer y escribir en localStorage con manejo seguro de errores.
    - No procesa datos ni valida eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-app.js
    - servicios/cm-review.service.js
    - servicios/cm-import.service.js
    - conexiones/cm-agendador.adapter.js
    - conexiones/cm-firebase-batch.adapter.js
*/

(function initCmStorage(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function canUseLocalStorage() {
    try {
      const testKey = "__cm_storage_test__";
      global.localStorage.setItem(testKey, "ok");
      global.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readJSON(key, fallback) {
    if (!canUseLocalStorage()) {
      return CM.clone ? CM.clone(fallback) : fallback;
    }

    try {
      const raw = global.localStorage.getItem(key);

      if (!raw) {
        return CM.clone ? CM.clone(fallback) : fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.warn(`[CM Storage] No se pudo leer ${key}:`, error);
      return CM.clone ? CM.clone(fallback) : fallback;
    }
  }

  function writeJSON(key, value) {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[CM Storage] No se pudo guardar ${key}:`, error);
      return false;
    }
  }

  function removeKey(key) {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      global.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`[CM Storage] No se pudo eliminar ${key}:`, error);
      return false;
    }
  }

  function getSettings() {
    const stored = readJSON(CONFIG.STORAGE_KEYS.SETTINGS, {});
    const defaults = CM.clone(CONFIG.DEFAULT_SETTINGS);

    return {
      ...defaults,
      ...stored,
      reminders: {
        ...defaults.reminders,
        ...(stored.reminders || {})
      },
      channels: {
        ...defaults.channels,
        ...(stored.channels || {})
      }
    };
  }

  function saveSettings(settings) {
    const current = getSettings();
    const next = {
      ...current,
      ...(settings || {}),
      reminders: {
        ...current.reminders,
        ...((settings && settings.reminders) || {})
      },
      channels: {
        ...current.channels,
        ...((settings && settings.channels) || {})
      },
      updatedAt: CM.nowISO()
    };

    writeJSON(CONFIG.STORAGE_KEYS.SETTINGS, next);
    return next;
  }

  function readBatches() {
    const batches = readJSON(CONFIG.STORAGE_KEYS.BATCHES, []);
    return Array.isArray(batches) ? batches : [];
  }

  function saveBatches(batches) {
    const safeBatches = Array.isArray(batches) ? batches : [];
    writeJSON(CONFIG.STORAGE_KEYS.BATCHES, safeBatches);
    return safeBatches;
  }

  function findBatchById(batchId) {
    return readBatches().find((batch) => batch.id === batchId) || null;
  }

  function createBatch(payload) {
    const now = CM.nowISO();
    const batch = {
      id: (payload && payload.id) || CM.createId("cm_batch"),
      name: (payload && payload.name) || `Carga masiva ${new Date().toLocaleDateString("es-EC")}`,
      status: (payload && payload.status) || CONFIG.BATCH_STATUS.REVIEW,
      sourceType: (payload && payload.sourceType) || CONFIG.SOURCE_TYPES.AUTO,
      sourceFileName: (payload && payload.sourceFileName) || "",
      totalDetected: Number((payload && payload.totalDetected) || 0),
      totalOk: Number((payload && payload.totalOk) || 0),
      totalReview: Number((payload && payload.totalReview) || 0),
      totalError: Number((payload && payload.totalError) || 0),
      totalSelected: Number((payload && payload.totalSelected) || 0),
      channels: (payload && payload.channels) || getSettings().channels,
      createdAt: now,
      updatedAt: now,
      importedAt: "",
      notes: (payload && payload.notes) || ""
    };

    const batches = readBatches();
    batches.unshift(batch);
    saveBatches(batches.slice(0, 80));
    setLastBatchId(batch.id);

    return batch;
  }

  function saveBatch(batch) {
    if (!batch || !batch.id) {
      throw new Error("No se puede guardar un lote sin ID.");
    }

    const now = CM.nowISO();
    const batches = readBatches();
    const index = batches.findIndex((item) => item.id === batch.id);
    const nextBatch = {
      ...batch,
      updatedAt: now
    };

    if (index >= 0) {
      batches[index] = {
        ...batches[index],
        ...nextBatch
      };
    } else {
      batches.unshift({
        ...nextBatch,
        createdAt: nextBatch.createdAt || now
      });
    }

    saveBatches(batches.slice(0, 80));
    setLastBatchId(nextBatch.id);

    return nextBatch;
  }

  function updateBatch(batchId, patch) {
    const batch = findBatchById(batchId);

    if (!batch) {
      return null;
    }

    return saveBatch({
      ...batch,
      ...(patch || {})
    });
  }

  function updateBatchStatus(batchId, status, extra) {
    return updateBatch(batchId, {
      ...(extra || {}),
      status
    });
  }

  function deleteBatch(batchId) {
    const batches = readBatches().filter((batch) => batch.id !== batchId);
    saveBatches(batches);

    if (getLastBatchId() === batchId) {
      removeKey(CONFIG.STORAGE_KEYS.LAST_BATCH_ID);
    }

    return true;
  }

  function getLastBatchId() {
    if (!canUseLocalStorage()) {
      return "";
    }

    try {
      return global.localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_BATCH_ID) || "";
    } catch (error) {
      return "";
    }
  }

  function setLastBatchId(batchId) {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      global.localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_BATCH_ID, batchId || "");
      return true;
    } catch (error) {
      return false;
    }
  }

  function readDraftEvents() {
    const events = readJSON(CONFIG.STORAGE_KEYS.DRAFT_EVENTS, []);
    return Array.isArray(events) ? events : [];
  }

  function saveDraftEvents(events) {
    const safeEvents = Array.isArray(events) ? events : [];
    writeJSON(CONFIG.STORAGE_KEYS.DRAFT_EVENTS, safeEvents);
    return safeEvents;
  }

  function getDraftEventsByBatch(batchId) {
    return readDraftEvents().filter((event) => event.batchId === batchId);
  }

  function saveDraftEventsForBatch(batchId, events) {
    const current = readDraftEvents().filter((event) => event.batchId !== batchId);
    const nextEvents = (Array.isArray(events) ? events : []).map((event) => ({
      ...event,
      batchId
    }));

    return saveDraftEvents([...nextEvents, ...current]);
  }

  function updateDraftEvent(eventId, patch) {
    const events = readDraftEvents();
    const index = events.findIndex((event) => event.id === eventId);

    if (index < 0) {
      return null;
    }

    events[index] = {
      ...events[index],
      ...(patch || {}),
      updatedAt: CM.nowISO()
    };

    saveDraftEvents(events);
    return events[index];
  }

  function removeDraftEvent(eventId) {
    const events = readDraftEvents().filter((event) => event.id !== eventId);
    saveDraftEvents(events);
    return true;
  }

  function clearDraftEvents(batchId) {
    if (!batchId) {
      saveDraftEvents([]);
      return true;
    }

    const remaining = readDraftEvents().filter((event) => event.batchId !== batchId);
    saveDraftEvents(remaining);
    return true;
  }

  function getCurrentPage() {
    const value = readJSON(CONFIG.STORAGE_KEYS.CURRENT_PAGE, CONFIG.PAGINATION.DEFAULT_PAGE);
    const page = Number(value);

    return Number.isFinite(page) && page > 0 ? page : CONFIG.PAGINATION.DEFAULT_PAGE;
  }

  function setCurrentPage(page) {
    const safePage = Number(page);

    writeJSON(
      CONFIG.STORAGE_KEYS.CURRENT_PAGE,
      Number.isFinite(safePage) && safePage > 0 ? safePage : CONFIG.PAGINATION.DEFAULT_PAGE
    );
  }

  function resetModule() {
    removeKey(CONFIG.STORAGE_KEYS.DRAFT_EVENTS);
    removeKey(CONFIG.STORAGE_KEYS.LAST_BATCH_ID);
    removeKey(CONFIG.STORAGE_KEYS.CURRENT_PAGE);
  }

  CM.Storage = {
    canUseLocalStorage,

    readJSON,
    writeJSON,
    removeKey,

    getSettings,
    saveSettings,

    readBatches,
    saveBatches,
    findBatchById,
    createBatch,
    saveBatch,
    updateBatch,
    updateBatchStatus,
    deleteBatch,

    getLastBatchId,
    setLastBatchId,

    readDraftEvents,
    saveDraftEvents,
    getDraftEventsByBatch,
    saveDraftEventsForBatch,
    updateDraftEvent,
    removeDraftEvent,
    clearDraftEvents,

    getCurrentPage,
    setCurrentPage,

    resetModule
  };
})(window);