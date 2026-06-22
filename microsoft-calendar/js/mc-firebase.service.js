/*
  Nombre completo: mc-firebase.service.js
  Ruta: microsoft-calendar/js/mc-firebase.service.js
  Función:
    - Inicializar Firebase para el módulo Microsoft Calendar.
    - Guardar en Firestore solo lo importante.
    - Leer el estado guardado de Microsoft Calendar.
    - Guardar estado de configuración, conexión, prueba, lectura y errores.
    - NO guardar access_token, refresh_token, id_token ni authorization_code.
  Se conecta con:
    - mc-config.js
    - mc-storage.js
    - mc-firebase-config.js
    - mc-connection.actions.js
    - mc-calendar.actions.js

  Firestore:
    - Colección: conexiones
    - Documento: microsoftCalendar
*/

(function initMcFirebaseService(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const CONFIG = MC.CONFIG;
  const Utils = MC.Utils;

  let firebaseApp = null;
  let firestoreDb = null;

  function assertFirebaseSdk() {
    if (!global.firebase) {
      throw new Error("Firebase SDK no está cargado. Revisa los scripts CDN en mc-index.html.");
    }

    if (!MC.FirebaseConfig) {
      throw new Error("Falta MC.FirebaseConfig. Revisa mc-firebase-config.js.");
    }
  }

  function getFirebaseApp() {
    assertFirebaseSdk();

    if (firebaseApp) {
      return firebaseApp;
    }

    if (global.firebase.apps && global.firebase.apps.length > 0) {
      firebaseApp = global.firebase.app();
      return firebaseApp;
    }

    firebaseApp = global.firebase.initializeApp(MC.FirebaseConfig);
    return firebaseApp;
  }

  function getFirestoreDb() {
    if (firestoreDb) {
      return firestoreDb;
    }

    firestoreDb = getFirebaseApp().firestore();
    return firestoreDb;
  }

  function getDocumentRef() {
    return getFirestoreDb()
      .collection(CONFIG.FIRESTORE_COLLECTION)
      .doc(CONFIG.FIRESTORE_DOCUMENT);
  }

  function sanitizeForFirestore(value) {
    if (value === undefined) {
      return null;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === "function") {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeForFirestore);
    }

    if (value && typeof value === "object") {
      const cleanObject = {};

      Object.entries(value).forEach(([key, entryValue]) => {
        if (entryValue !== undefined && typeof entryValue !== "function") {
          cleanObject[key] = sanitizeForFirestore(entryValue);
        }
      });

      return cleanObject;
    }

    return value;
  }

  function createSafeError(error) {
    const message = error && error.message
      ? error.message
      : String(error || "Error desconocido");

    return {
      message,
      at: Utils.nowIso()
    };
  }

  function createAccountPatch(accountSlot, patch) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safePatch = Utils.isPlainObject(patch) ? patch : {};

    return {
      accounts: {
        [slot]: sanitizeForFirestore({
          ...safePatch,
          slot,
          label: Utils.getAccountLabel(slot)
        })
      }
    };
  }

  async function setMerge(payload) {
    const safePayload = sanitizeForFirestore({
      ...payload,
      provider: CONFIG.PROVIDER,
      updatedAt: Utils.nowIso()
    });

    await getDocumentRef().set(safePayload, { merge: true });

    return {
      ok: true,
      firestorePath: CONFIG.FIRESTORE_PATH,
      payload: safePayload
    };
  }

  async function checkFirebaseConnection() {
    await getDocumentRef().get();

    return {
      ok: true,
      firestorePath: CONFIG.FIRESTORE_PATH,
      projectId: MC.FirebaseConfig.projectId
    };
  }

  async function readMicrosoftCalendarConnectionStatus() {
    const snapshot = await getDocumentRef().get();

    if (!snapshot.exists) {
      return {
        ok: true,
        exists: false,
        firestorePath: CONFIG.FIRESTORE_PATH,
        data: null
      };
    }

    return {
      ok: true,
      exists: true,
      firestorePath: CONFIG.FIRESTORE_PATH,
      data: snapshot.data()
    };
  }

  async function saveMicrosoftCalendarSavedConnectionStatus(connection) {
    const publicPayload = Utils.createPublicConnectionForFirebase(connection);

    return setMerge({
      ...publicPayload,
      configured: Boolean(publicPayload.configured),
      lastAction: "savedConnection",
      lastSavedAt: Utils.nowIso()
    });
  }

  async function saveMicrosoftCalendarConnectedStatus(options) {
    const safeOptions = options || {};
    const slot = Utils.normalizeAccountSlot(safeOptions.accountSlot);
    const account = Utils.normalizeAccount(slot, safeOptions.account);

    return setMerge({
      lastAction: "connectedAccount",
      lastConnectedAccountSlot: slot,
      lastConnectedAt: Utils.nowIso(),
      ...createAccountPatch(slot, {
        ...account,
        connected: true,
        lastConnectedAt: Utils.nowIso(),
        lastError: null
      })
    });
  }

  async function saveMicrosoftCalendarEventCreatedStatus(options) {
    const safeOptions = options || {};
    const slot = Utils.normalizeAccountSlot(safeOptions.accountSlot);
    const account = Utils.normalizeAccount(slot, safeOptions.account);
    const event = safeOptions.event || {};

    return setMerge({
      lastAction: "createdEvent",
      lastTestAccountSlot: slot,
      lastTestAt: Utils.nowIso(),
      ...createAccountPatch(slot, {
        ...account,
        connected: true,
        lastTestAt: Utils.nowIso(),
        lastEventCreated: {
          id: Utils.cleanString(event.id),
          subject: Utils.cleanString(event.subject),
          webLink: Utils.cleanString(event.webLink),
          start: event.start || null,
          end: event.end || null,
          createdAt: Utils.nowIso()
        },
        lastError: null
      })
    });
  }

  async function saveMicrosoftCalendarEventsReadStatus(options) {
    const safeOptions = options || {};
    const slot = Utils.normalizeAccountSlot(safeOptions.accountSlot);
    const account = Utils.normalizeAccount(slot, safeOptions.account);
    const events = Array.isArray(safeOptions.events) ? safeOptions.events : [];

    return setMerge({
      lastAction: "readEvents",
      lastReadAccountSlot: slot,
      lastEventsReadAt: Utils.nowIso(),
      ...createAccountPatch(slot, {
        ...account,
        connected: true,
        lastEventsReadAt: Utils.nowIso(),
        lastEventsCount: events.length,
        lastEventsPreview: events.slice(0, 5),
        lastError: null
      })
    });
  }

  async function saveMicrosoftCalendarCalendarsReadStatus(options) {
    const safeOptions = options || {};
    const calendars = Array.isArray(safeOptions.calendars) ? safeOptions.calendars : [];

    return setMerge({
      lastAction: "readCalendars",
      lastCalendarsReadAt: Utils.nowIso(),
      lastCalendarsCount: calendars.length,
      lastCalendarsPreview: calendars.slice(0, 8)
    });
  }

  async function saveMicrosoftCalendarErrorStatus(options) {
    const safeOptions = options || {};
    const slot = safeOptions.accountSlot
      ? Utils.normalizeAccountSlot(safeOptions.accountSlot)
      : "";

    const error = createSafeError(safeOptions.error || safeOptions.message);

    if (slot) {
      return setMerge({
        lastAction: "error",
        lastError: error,
        ...createAccountPatch(slot, {
          connected: false,
          lastError: error
        })
      });
    }

    return setMerge({
      lastAction: "error",
      lastError: error
    });
  }

  async function clearMicrosoftCalendarStatus() {
    await getDocumentRef().delete();

    return {
      ok: true,
      firestorePath: CONFIG.FIRESTORE_PATH,
      deleted: true
    };
  }

  MC.FirebaseService = {
    getFirebaseApp,
    getFirestoreDb,
    getDocumentRef,

    checkFirebaseConnection,
    readMicrosoftCalendarConnectionStatus,

    saveMicrosoftCalendarSavedConnectionStatus,
    saveMicrosoftCalendarConnectedStatus,
    saveMicrosoftCalendarEventCreatedStatus,
    saveMicrosoftCalendarEventsReadStatus,
    saveMicrosoftCalendarCalendarsReadStatus,
    saveMicrosoftCalendarErrorStatus,
    clearMicrosoftCalendarStatus
  };
})(window);