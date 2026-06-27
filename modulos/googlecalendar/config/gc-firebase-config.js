/*
  Nombre completo: gc-firebase-config.js
  Ruta: modulos/googlecalendar/config/gc-firebase-config.js

  Función:
    - Mantener separada la configuración Firebase del módulo Google Calendar.
    - Tomar la configuración Firebase interna compartida por AgendaJeff cuando esté disponible.
    - Permitir respaldo por variable global o localStorage en la PC del usuario.
    - Evitar duplicar claves dentro de este archivo.

  Se conecta con:
    - modulos/telegram/config/tl-firebase-config.js
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/firebase/gc-firebase-init.js
    - modulos/googlecalendar/firebase/gc-firebase-test.js
*/

(function initGoogleCalendarFirebaseConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const LOCAL_CONFIG_KEY = "agendaJeff.firebase.config.v1";

  const firebaseConfigTemplate = Object.freeze({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  });

  function isText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function pickText(source, key) {
    if (!source || typeof source !== "object") {
      return "";
    }

    return isText(source[key]) ? source[key].trim() : "";
  }

  function normalizeFirebaseConfig(source) {
    const data = source && typeof source === "object" ? source : {};

    return {
      apiKey: pickText(data, "apiKey"),
      authDomain: pickText(data, "authDomain"),
      projectId: pickText(data, "projectId"),
      storageBucket: pickText(data, "storageBucket"),
      messagingSenderId: pickText(data, "messagingSenderId"),
      appId: pickText(data, "appId"),
      measurementId: pickText(data, "measurementId")
    };
  }

  function readSharedModuleConfig() {
    const telegram = root.Telegram || {};

    if (telegram.FirebaseConfig && typeof telegram.FirebaseConfig.getFirebaseConfig === "function") {
      return telegram.FirebaseConfig.getFirebaseConfig();
    }

    return {};
  }

  function readGlobalConfig() {
    if (global.AGENDAJEFF_FIREBASE_CONFIG && typeof global.AGENDAJEFF_FIREBASE_CONFIG === "object") {
      return global.AGENDAJEFF_FIREBASE_CONFIG;
    }

    if (global.AJ_FIREBASE_CONFIG && typeof global.AJ_FIREBASE_CONFIG === "object") {
      return global.AJ_FIREBASE_CONFIG;
    }

    return {};
  }

  function readLocalConfig() {
    try {
      if (!global.localStorage) {
        return {};
      }

      const rawValue = global.localStorage.getItem(LOCAL_CONFIG_KEY);
      return rawValue ? JSON.parse(rawValue) : {};
    } catch (error) {
      return {};
    }
  }

  function mergeFirebaseConfig() {
    const sharedConfig = normalizeFirebaseConfig(readSharedModuleConfig());
    const globalConfig = normalizeFirebaseConfig(readGlobalConfig());
    const localConfig = normalizeFirebaseConfig(readLocalConfig());

    return {
      apiKey: sharedConfig.apiKey || globalConfig.apiKey || localConfig.apiKey || firebaseConfigTemplate.apiKey,
      authDomain: sharedConfig.authDomain || globalConfig.authDomain || localConfig.authDomain || firebaseConfigTemplate.authDomain,
      projectId: sharedConfig.projectId || globalConfig.projectId || localConfig.projectId || firebaseConfigTemplate.projectId,
      storageBucket: sharedConfig.storageBucket || globalConfig.storageBucket || localConfig.storageBucket || firebaseConfigTemplate.storageBucket,
      messagingSenderId: sharedConfig.messagingSenderId || globalConfig.messagingSenderId || localConfig.messagingSenderId || firebaseConfigTemplate.messagingSenderId,
      appId: sharedConfig.appId || globalConfig.appId || localConfig.appId || firebaseConfigTemplate.appId,
      measurementId: sharedConfig.measurementId || globalConfig.measurementId || localConfig.measurementId || firebaseConfigTemplate.measurementId
    };
  }

  function getFirebaseConfig() {
    return mergeFirebaseConfig();
  }

  function saveFirebaseConfigLocal(config) {
    const normalized = normalizeFirebaseConfig(config);

    try {
      if (!global.localStorage) {
        return {
          ok: false,
          message: "localStorage no está disponible.",
          checkedAt: new Date().toISOString()
        };
      }

      global.localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(normalized));

      return {
        ok: true,
        message: "Configuración Firebase guardada localmente.",
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : "No se pudo guardar Firebase local.",
        checkedAt: new Date().toISOString()
      };
    }
  }

  function detectConfigSource() {
    const sharedConfig = normalizeFirebaseConfig(readSharedModuleConfig());
    const globalConfig = normalizeFirebaseConfig(readGlobalConfig());
    const localConfig = normalizeFirebaseConfig(readLocalConfig());

    if (isText(sharedConfig.projectId) && isText(sharedConfig.appId)) {
      return "agendaJeff-interno";
    }

    if (isText(globalConfig.projectId) && isText(globalConfig.appId)) {
      return "global";
    }

    if (isText(localConfig.projectId) && isText(localConfig.appId)) {
      return "localStorage";
    }

    return "empty";
  }

  function validateFirebaseConfig() {
    const firebaseConfig = getFirebaseConfig();
    const requiredFields = [
      "apiKey",
      "authDomain",
      "projectId",
      "storageBucket",
      "messagingSenderId",
      "appId"
    ];

    const missingFields = requiredFields.filter(function filterMissing(field) {
      return !isText(firebaseConfig[field]);
    });

    return {
      ok: missingFields.length === 0,
      missingFields,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      source: detectConfigSource(),
      checkedAt: new Date().toISOString()
    };
  }

  googleCalendar.FirebaseConfig = Object.freeze({
    LOCAL_CONFIG_KEY,
    getFirebaseConfig,
    saveFirebaseConfigLocal,
    validateFirebaseConfig
  });
})(window);
