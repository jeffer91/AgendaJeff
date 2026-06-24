/*
  Nombre completo: cm-firebase-batch.adapter.js
  Ruta: carga-masiva/js/conexiones/cm-firebase-batch.adapter.js

  Función:
    - Guardar el resumen compacto del lote de Carga Masiva en Firebase.
    - Guardar una copia compacta de los eventos del lote en subcolección.
    - Inicializar Firebase aunque ningún otro módulo lo haya hecho antes.
    - Evitar subir texto completo pesado o basura OCR.
    - Guardar solo lote, totales, estado, origen, canales, fecha, títulos y metadata compacta.
    - Si Firebase no está disponible, guardar respaldo local y no romper la importación.
*/

(function initCmFirebaseBatchAdapter(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  const FIREBASE_APP_NAME = "AgendaJeffCargaMasivaLocal";

  const COLLECTIONS = {
    BATCHES: "cargasMasivas",
    EVENTS: "eventos"
  };

  let firebaseApp = null;
  let firestoreDb = null;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function sanitizeForFirestore(value) {
    if (value === undefined || typeof value === "function") {
      return null;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeForFirestore);
    }

    if (value && typeof value === "object") {
      const output = {};
      Object.entries(value).forEach(([key, entryValue]) => {
        if (entryValue !== undefined && typeof entryValue !== "function") {
          output[key] = sanitizeForFirestore(entryValue);
        }
      });
      return output;
    }

    return value;
  }

  function isFirebaseSdkAvailable() {
    return Boolean(
      global.firebase &&
      typeof global.firebase.initializeApp === "function" &&
      typeof global.firebase.firestore === "function"
    );
  }

  function getFirebaseApps() {
    if (!global.firebase || !Array.isArray(global.firebase.apps)) {
      return [];
    }

    return global.firebase.apps;
  }

  function getExistingNamedApp() {
    return getFirebaseApps().find((app) => app && app.name === FIREBASE_APP_NAME) || null;
  }

  function getAnyExistingApp() {
    const apps = getFirebaseApps();
    return apps.length ? apps[0] : null;
  }

  function getFirebaseConfig() {
    const candidates = [
      global.CM && global.CM.FirebaseConfig,
      global.AG && global.AG.FirebaseConfig,
      global.GC && global.GC.FirebaseConfig,
      global.MC && global.MC.FirebaseConfig,
      global.TL && global.TL.FirebaseConfig,
      global.NT && global.NT.FirebaseConfig
    ].filter(Boolean);

    const config = candidates.find((candidate) => {
      return candidate && candidate.apiKey && candidate.projectId && candidate.appId;
    });

    if (!config) {
      throw new Error("No se encontró configuración Firebase para Carga Masiva.");
    }

    return config;
  }

  function initFirebase() {
    if (!isFirebaseSdkAvailable()) {
      throw new Error("Firebase SDK compat no está cargado en Carga Masiva.");
    }

    if (firebaseApp && firestoreDb) {
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    const existingNamedApp = getExistingNamedApp();

    if (existingNamedApp) {
      firebaseApp = existingNamedApp;
      firestoreDb = global.firebase.firestore(firebaseApp);
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    const existingAnyApp = getAnyExistingApp();

    if (existingAnyApp) {
      firebaseApp = existingAnyApp;
      firestoreDb = global.firebase.firestore(firebaseApp);
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    firebaseApp = global.firebase.initializeApp(getFirebaseConfig(), FIREBASE_APP_NAME);
    firestoreDb = global.firebase.firestore(firebaseApp);

    return {
      app: firebaseApp,
      db: firestoreDb
    };
  }

  function hasFirebaseApp() {
    return Boolean(isFirebaseSdkAvailable() && getFirebaseApps().length);
  }

  function getFirestore() {
    try {
      return initFirebase().db;
    } catch (error) {
      console.warn("[CM FirebaseBatchAdapter] Firebase no disponible:", error.message);
      return null;
    }
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

    return sanitizeForFirestore({
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
    });
  }

  function createBatchSummary(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const events = Array.isArray(safePayload.events) ? safePayload.events : [];
    const agendadorResult = safePayload.agendadorResult || {};
    const counts = countByStatus(events);

    return sanitizeForFirestore({
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

      sampleTitles: events.slice(0, 5).map((event) => event.title).filter(Boolean),

      createdAt: batch.createdAt || CM.nowISO(),
      updatedAt: CM.nowISO(),
      importedAt: CM.nowISO()
    });
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
    const baseRef = db.collection(COLLECTIONS.BATCHES).doc(batchId).collection(COLLECTIONS.EVENTS);

    safeEvents.forEach((event, index) => {
      const compact = compactEvent(event, index);
      batchWriter.set(baseRef.doc(compact.id), compact, { merge: true });
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

    const patch = sanitizeForFirestore({
      status: CONFIG.BATCH_STATUS.IMPORTED,
      importedAt: CM.nowISO(),
      updatedAt: CM.nowISO(),
      ...(extra || {})
    });

    await db.collection(COLLECTIONS.BATCHES).doc(batchId).set(patch, { merge: true });

    return {
      ok: true,
      batchId,
      patch
    };
  }

  async function checkFirebaseConnection() {
    const db = getFirestore();

    if (!db) {
      return {
        ok: false,
        message: "Firebase no está disponible para Carga Masiva."
      };
    }

    const checkId = "_conexion_carga_masiva";
    const checkedAt = CM.nowISO();

    await db.collection(COLLECTIONS.BATCHES).doc(checkId).set({
      ok: true,
      moduleName: CONFIG.MODULE_NAME,
      checkedAt,
      updatedAt: checkedAt
    }, { merge: true });

    return {
      ok: true,
      message: "Firebase conectado correctamente para Carga Masiva.",
      firestorePath: `${COLLECTIONS.BATCHES}/${checkId}`,
      checkedAt
    };
  }

  CM.FirebaseBatchAdapter = {
    COLLECTIONS,
    FIREBASE_APP_NAME,

    isFirebaseSdkAvailable,
    hasFirebaseApp,
    getFirebaseConfig,
    initFirebase,
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
    markBatchAsImported,
    checkFirebaseConnection
  };
})(window);
