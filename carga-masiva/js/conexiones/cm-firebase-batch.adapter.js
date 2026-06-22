/*
  Nombre completo: cm-firebase-batch.adapter.js
  Ruta: carga-masiva/js/conexiones/cm-firebase-batch.adapter.js

  Función:
    - Guardar el resumen compacto del lote de Carga Masiva en Firebase.
    - Guardar una copia compacta de los eventos del lote en subcolección.
    - Evitar subir texto completo pesado o basura OCR.
    - Guardar solo lo importante:
      lote, totales, estado, origen, canales, fecha, títulos y metadata compacta.
    - Si Firebase no está disponible, guardar respaldo local y no romper la importación.
    - No crea eventos en Google, Microsoft, Telegram ni Notificaciones.

  Se conecta con:
    - cm-config.js
    - cm-storage.js
    - servicios/cm-import.service.js
    - conexiones/cm-agendador.adapter.js
    - Firebase SDK compat
    - Opcionalmente con una configuración Firebase global ya inicializada.
*/

(function initCmFirebaseBatchAdapter(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  const COLLECTIONS = {
    BATCHES: "cargasMasivas",
    EVENTS: "eventos"
  };

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function isFirebaseSdkAvailable() {
    return Boolean(global.firebase && typeof global.firebase.firestore === "function");
  }

  function hasFirebaseApp() {
    return Boolean(
      isFirebaseSdkAvailable() &&
      global.firebase.apps &&
      global.firebase.apps.length
    );
  }

  function getFirestore() {
    if (!isFirebaseSdkAvailable()) {
      return null;
    }

    if (!hasFirebaseApp()) {
      return null;
    }

    return global.firebase.firestore();
  }

  function isAvailable() {
    return Boolean(getFirestore());
  }

  function compactChannels(channels) {
    const safeChannels = channels || {};

    return {
      local: safeChannels.local !== false,
      firebase: safeChannels.firebase !== false,
      googleCalendar: safeChannels.googleCalendar !== false,
      microsoftCalendar: safeChannels.microsoftCalendar !== false,
      telegram: safeChannels.telegram !== false,
      desktopNotifications: safeChannels.desktopNotifications !== false
    };
  }

  function countByStatus(events) {
    const safeEvents = Array.isArray(events) ? events : [];

    return {
      total: safeEvents.length,
      ok: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.OK).length,
      review: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.REVIEW).length,
      error: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.ERROR).length,
      selected: safeEvents.filter((event) => event.selected !== false).length
    };
  }

  function countByType(events) {
    const result = {};
    const safeEvents = Array.isArray(events) ? events : [];

    safeEvents.forEach((event) => {
      const type = event.type || "event";
      result[type] = (result[type] || 0) + 1;
    });

    return result;
  }

  function compactEvent(event, index) {
    const safeEvent = event || {};

    return {
      id: safeEvent.id || CM.createId("cm-event"),
      order: index + 1,
      batchId: safeEvent.batchId || "",
      title: normalizeText(safeEvent.title),
      type: safeEvent.type || CONFIG.EVENT_TYPES.EVENT,
      reviewStatus: safeEvent.reviewStatus || CONFIG.REVIEW_STATUS.OK,
      selected: safeEvent.selected !== false,

      startDate: safeEvent.startDate || "",
      endDate: safeEvent.endDate || safeEvent.startDate || "",
      startTime: safeEvent.startTime || "",
      endTime: safeEvent.endTime || "",
      allDay: Boolean(safeEvent.allDay),

      location: normalizeText(safeEvent.location),
      responsible: normalizeText(safeEvent.responsible),

      defense: safeEvent.type === CONFIG.EVENT_TYPES.DEFENSE
        ? {
            studentName: normalizeText(safeEvent.studentName),
            idNumber: normalizeText(safeEvent.idNumber),
            career: normalizeText(safeEvent.career),
            tribunal1: normalizeText(safeEvent.tribunal1),
            tribunal2: normalizeText(safeEvent.tribunal2)
          }
        : null,

      warningsCount: Array.isArray(safeEvent.warnings) ? safeEvent.warnings.length : 0,
      errorsCount: Array.isArray(safeEvent.errors) ? safeEvent.errors.length : 0,

      sourceType: safeEvent.sourceMeta && safeEvent.sourceMeta.sourceType
        ? safeEvent.sourceMeta.sourceType
        : safeEvent.sourceType || "",

      agItemId: safeEvent.agItemId || "",
      createdAt: safeEvent.createdAt || CM.nowISO(),
      updatedAt: CM.nowISO()
    };
  }

  function createBatchSummary(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const events = Array.isArray(safePayload.events) ? safePayload.events : [];
    const agendadorResult = safePayload.agendadorResult || {};
    const counts = countByStatus(events);

    return {
      id: batch.id || CM.createId("cm-batch"),
      name: batch.name || "Carga masiva",
      origin: "cargaMasiva",
      status: batch.status || CONFIG.BATCH_STATUS.IMPORTED,
      sourceType: batch.sourceType || CONFIG.SOURCE_TYPES.AUTO,
      sourceFileName: batch.sourceFileName || "",

      totals: {
        detected: counts.total,
        selected: counts.selected,
        ok: counts.ok,
        review: counts.review,
        error: counts.error,
        byType: countByType(events)
      },

      channels: compactChannels(batch.channels || CONFIG.DEFAULT_CHANNELS),

      importResult: {
        ok: Boolean(agendadorResult.ok),
        total: Number(agendadorResult.total || events.length || 0),
        saved: Number(agendadorResult.saved || 0),
        failed: Number(agendadorResult.failed || 0),
        importedAt: agendadorResult.importedAt || CM.nowISO()
      },

      sampleTitles: events
        .slice(0, 5)
        .map((event) => event.title)
        .filter(Boolean),

      createdAt: batch.createdAt || CM.nowISO(),
      updatedAt: CM.nowISO(),
      importedAt: CM.nowISO()
    };
  }

  function saveLocalFallback(summary, events, reason) {
    const key = "agendajeff_cm_firebase_batch_fallback_v1";
    const current = CM.Storage.readJSON(key, []);

    const record = {
      id: summary.id,
      summary,
      events: events.map(compactEvent),
      reason: reason || "Firebase no disponible.",
      savedAt: CM.nowISO()
    };

    const next = [record].concat(Array.isArray(current) ? current : []).slice(0, 50);
    CM.Storage.writeJSON(key, next);

    return {
      ok: false,
      skipped: true,
      fallback: true,
      message: reason || "Firebase no disponible. Se guardó respaldo local del lote.",
      localKey: key,
      batchId: summary.id
    };
  }

  async function saveCompactEvents(db, batchId, events) {
    const safeEvents = Array.isArray(events) ? events : [];

    if (!safeEvents.length) {
      return {
        ok: true,
        total: 0,
        message: "No hay eventos compactos para guardar."
      };
    }

    const batchWriter = db.batch();
    const baseRef = db
      .collection(COLLECTIONS.BATCHES)
      .doc(batchId)
      .collection(COLLECTIONS.EVENTS);

    safeEvents.forEach((event, index) => {
      const compact = compactEvent(event, index);
      const docRef = baseRef.doc(compact.id);
      batchWriter.set(docRef, compact, { merge: true });
    });

    await batchWriter.commit();

    return {
      ok: true,
      total: safeEvents.length,
      message: "Eventos compactos del lote guardados."
    };
  }

  async function saveBatchSummary(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const events = Array.isArray(safePayload.events) ? safePayload.events : [];
    const summary = createBatchSummary(safePayload);

    if (!batch.id) {
      return saveLocalFallback(summary, events, "No hay ID de lote para guardar en Firebase.");
    }

    const db = getFirestore();

    if (!db) {
      return saveLocalFallback(summary, events, "Firebase no está inicializado.");
    }

    try {
      const batchRef = db.collection(COLLECTIONS.BATCHES).doc(batch.id);

      await batchRef.set(summary, { merge: true });

      const compactEventsResult = await saveCompactEvents(db, batch.id, events);

      return {
        ok: true,
        skipped: false,
        batchId: batch.id,
        summary,
        compactEvents: compactEventsResult,
        message: "Resumen compacto del lote guardado en Firebase."
      };
    } catch (error) {
      return saveLocalFallback(summary, events, error.message);
    }
  }

  async function markBatchAsImported(batchId, extra) {
    const db = getFirestore();

    if (!db || !batchId) {
      return {
        ok: false,
        skipped: true,
        message: "Firebase no disponible o falta batchId."
      };
    }

    const patch = {
      status: CONFIG.BATCH_STATUS.IMPORTED,
      importedAt: CM.nowISO(),
      updatedAt: CM.nowISO(),
      ...(extra || {})
    };

    await db.collection(COLLECTIONS.BATCHES).doc(batchId).set(patch, { merge: true });

    return {
      ok: true,
      batchId,
      patch
    };
  }

  CM.FirebaseBatchAdapter = {
    COLLECTIONS,

    isFirebaseSdkAvailable,
    hasFirebaseApp,
    getFirestore,
    isAvailable,

    compactChannels,
    countByStatus,
    countByType,
    compactEvent,
    createBatchSummary,

    saveLocalFallback,
    saveCompactEvents,
    saveBatchSummary,
    markBatchAsImported
  };
})(window);