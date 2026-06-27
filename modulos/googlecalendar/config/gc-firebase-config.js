/*
  Nombre completo: gc-firebase-config.js
  Ruta: modulos/googlecalendar/config/gc-firebase-config.js

  Función:
    - Mantener separada la configuración Firebase del módulo Google Calendar.
    - Exponer validaciones básicas para saber si la configuración está completa.
    - Evitar que datos sensibles queden escritos directamente en el repositorio público.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - futuras capas de Firebase del módulo Google Calendar
*/

(function initGoogleCalendarFirebaseConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};

  const firebaseConfig = Object.freeze({
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

  function getFirebaseConfig() {
    return {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId
    };
  }

  function validateFirebaseConfig() {
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
      checkedAt: new Date().toISOString()
    };
  }

  googleCalendar.FirebaseConfig = Object.freeze({
    getFirebaseConfig,
    validateFirebaseConfig
  });
})(window);
