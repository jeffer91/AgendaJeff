/*
  Nombre completo: cm-undo.service.js
  Ruta: carga-masiva/js/servicios/cm-undo.service.js

  Función:
    - Deshacer la última carga masiva importada.
    - Eliminar del Agendador los registros locales que pertenecen al último lote.
    - Marcar el lote como deshecho para evitar dobles eliminaciones.
    - Guardar historial local de deshacer.
    - Sincronizar recordatorios de segundo plano después de eliminar.

  Alcance:
    - Deshace el guardado local del Agendador.
    - No elimina eventos ya creados en Google/Microsoft porque esos canales externos requieren IDs y permisos separados.
*/

(function initCmUndoService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function readUndoHistory() {
    return CM.Storage.readJSON(CONFIG.STORAGE_KEYS.UNDO_HISTORY, []);
  }

  function saveUndoHistory(history) {
    const safeHistory = Array.isArray(history) ? history : [];
    CM.Storage.writeJSON(CONFIG.STORAGE_KEYS.UNDO_HISTORY, safeHistory.slice(0, 80));
    return safeHistory;
  }

  function getAG() {
    return global.AG || null;
  }

  function ensureAgStorage() {
    const AG = getAG();

    if (!AG || !AG.Storage || typeof AG.Storage.readItems !== "function" || typeof AG.Storage.saveItems !== "function") {
      throw new Error("No está disponible el almacenamiento del Agendador para deshacer la carga.");
    }

    return AG;
  }

  function getLastBatch() {
    const lastBatchId = CM.Storage.getLastBatchId();

    if (!lastBatchId) {
      return null;
    }

    return CM.Storage.findBatchById(lastBatchId);
  }

  function belongsToBatch(item, batchId) {
    const safeItem = item || {};
    const cm = safeItem.cm || {};

    return normalizeText(cm.batchId) === batchId ||
      normalizeText(safeItem.batchId) === batchId ||
      (normalizeText(safeItem.origin) === "cargaMasiva" && normalizeText(cm.batchId) === batchId) ||
      (normalizeText(safeItem.source) === "cargaMasiva" && normalizeText(cm.batchId) === batchId);
  }

  function getUndoPreview(batchId) {
    const AG = ensureAgStorage();
    const safeBatchId = normalizeText(batchId);

    if (!safeBatchId) {
      throw new Error("Falta el ID del lote para revisar deshacer.");
    }

    const items = AG.Storage.readItems();
    const itemsToRemove = items.filter((item) => belongsToBatch(item, safeBatchId));

    return {
      ok: true,
      batchId: safeBatchId,
      totalItems: items.length,
      removable: itemsToRemove.length,
      titles: itemsToRemove.slice(0, 10).map((item) => item.title || "Sin título")
    };
  }

  async function syncBackgroundAfterUndo(AG) {
    if (AG && AG.Storage && typeof AG.Storage.syncBackgroundNow === "function") {
      try {
        return await AG.Storage.syncBackgroundNow();
      } catch (error) {
        return {
          ok: false,
          message: error.message
        };
      }
    }

    return {
      ok: false,
      skipped: true,
      message: "No hay sincronización de segundo plano disponible."
    };
  }

  async function undoBatch(batchId) {
    const AG = ensureAgStorage();
    const safeBatchId = normalizeText(batchId);
    const batch = CM.Storage.findBatchById(safeBatchId);

    if (!batch) {
      throw new Error("No se encontró el lote para deshacer.");
    }

    if (batch.status === CONFIG.BATCH_STATUS.UNDONE) {
      throw new Error("Este lote ya fue deshecho anteriormente.");
    }

    const items = AG.Storage.readItems();
    const itemsToKeep = items.filter((item) => !belongsToBatch(item, safeBatchId));
    const removedItems = items.filter((item) => belongsToBatch(item, safeBatchId));

    if (!removedItems.length) {
      throw new Error("No se encontraron eventos locales de ese lote para deshacer.");
    }

    AG.Storage.saveItems(itemsToKeep);

    const undoneAt = CM.nowISO();
    const updatedBatch = CM.Storage.updateBatchStatus(safeBatchId, CONFIG.BATCH_STATUS.UNDONE, {
      undoneAt,
      removedLocalItems: removedItems.length,
      undoMessage: `Se eliminaron ${removedItems.length} registros locales del Agendador.`
    });

    const history = readUndoHistory();
    history.unshift({
      id: CM.createId("cm_undo"),
      batchId: safeBatchId,
      batchName: batch.name || "Carga masiva",
      removedLocalItems: removedItems.length,
      removedItemIds: removedItems.map((item) => item.id),
      removedTitles: removedItems.slice(0, 20).map((item) => item.title || "Sin título"),
      undoneAt
    });
    saveUndoHistory(history);

    const backgroundSync = await syncBackgroundAfterUndo(AG);

    return {
      ok: true,
      batchId: safeBatchId,
      batch: updatedBatch,
      removed: removedItems.length,
      remaining: itemsToKeep.length,
      backgroundSync,
      message: `Se deshizo la última carga: ${removedItems.length} eventos eliminados del Agendador.`,
      undoneAt
    };
  }

  async function undoLastImportedBatch() {
    const batch = getLastBatch();

    if (!batch) {
      throw new Error("No existe una última carga para deshacer.");
    }

    if (batch.status !== CONFIG.BATCH_STATUS.IMPORTED) {
      throw new Error("Solo se puede deshacer un lote que ya fue importado.");
    }

    return undoBatch(batch.id);
  }

  CM.UndoService = {
    readUndoHistory,
    saveUndoHistory,
    getLastBatch,
    getUndoPreview,
    undoBatch,
    undoLastImportedBatch
  };
})(window);
