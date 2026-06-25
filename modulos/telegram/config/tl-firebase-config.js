/*
  Nombre completo: tl-firebase-config.js
  Ruta: modulos/telegram/config/tl-firebase-config.js

  Función:
    - Guardar la configuración Firebase exclusiva del módulo Telegram.
    - Mantener separada la configuración Firebase de la lógica de lectura y guardado.
    - Exponer validaciones básicas para saber si la configuración está completa.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/firebase/tl-firebase-init.js
    - modulos/telegram/diagnostic/tl-diagnostic-firebase.js
*/

(function initTelegramFirebaseConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};

  const firebaseConfig = Object.freeze({
    apiKey: "AIzaSyBm5pvLOLzj4sBjFRo96h3SEMlOJLt-wFM",
    authDomain: "jeff-2f92d.firebaseapp.com",
    projectId: "jeff-2f92d",
    storageBucket: "jeff-2f92d.firebasestorage.app",
    messagingSenderId: "337984443748",
    appId: "1:337984443748:web:86e7019aa4a5559c",
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
      checkedAt: new Date().toISOString()
    };
  }

  telegram.FirebaseConfig = Object.freeze({
    getFirebaseConfig,
    validateFirebaseConfig
  });
})(window);
