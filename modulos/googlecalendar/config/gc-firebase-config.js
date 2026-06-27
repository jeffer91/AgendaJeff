/*
  Nombre completo: gc-firebase-config.js
  Ruta: modulos/googlecalendar/config/gc-firebase-config.js

  Función:
    - Mantener separada la configuración Firebase del módulo Google Calendar.
    - Exponer validaciones básicas para saber si la configuración está completa.
    - Evitar escribir credenciales directamente dentro del código del repositorio.
    - Permitir configuración por variable global o localStorage en la PC del usuario.

  Se conecta con:
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

  function readGlobalConfig() {
    if (global.AGENDAJEFF_FIREBASE_CONFIG && typeof global.AGENDAJEFF_FIREBASE_CONFIG === "object") {
      return global.AGENDAJEFF_FIREBASE_CONFIG;
    }

    if (global.AJ_FIREBASE_CONFIG && typeof global.AJ_FIREBASE_CONFIG === "object") {
      return global.AJ_FIREBASE_CONFIG;
    }

    return {};
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

  function getFirebaseConfig() {
    const globalConfig = normalizeFirebaseConfig(readGlobalConfig());
    const localConfig = normalizeFirebaseConfig(readLocalConfig());

    return {
      apiKey: globalConfig.apiKey || localConfig.apiKey || firebaseConfigTemplate.apiKey,
      authDomain: globalConfig.authDomain || localConfig.authDomain || firebaseConfigTemplate.authDomain,
      projectId: globalConfig.projectId || localConfig.projectId || firebaseConfigTemplate.projectId,
      storageBucket: globalConfig.storageBucket || localConfig.storageBucket || firebaseConfigTemplate.storageBucket,
      messagingSenderId: globalConfig.messagingSenderId || localConfig.messagingSenderId || firebaseConfigTemplate.messagingSenderId,
      appId: globalConfig.appId || localConfig.appId || firebaseConfigTemplate.appId,
      measurementId: globalConfig.measurementId || localConfig.measurementId || firebaseConfigTemplate.measurementId
    };
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
      source: Object.keys(readGlobalConfig()).length ? "global" : Object.keys(readLocalConfig()).length ? "localStorage" : "empty",
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
