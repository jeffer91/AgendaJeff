/*
  Nombre completo: mc-firebase-config.js
  Ruta: microsoft-calendar/js/mc-firebase-config.js
  Función:
    - Guardar la configuración pública de Firebase Web.
    - Separar la configuración Firebase del servicio Firestore.
    - Permitir que Microsoft Calendar guarde solo lo importante en Firestore.
  Se conecta con:
    - mc-config.js
    - mc-firebase.service.js

  Proyecto Firebase:
    - projectId: jeff-2f92d

  Importante:
    - Este archivo es independiente del módulo Telegram.
    - Este archivo es independiente del módulo Google Calendar.
    - Este archivo usa window.MC.
*/

(function initMcFirebaseConfig(global) {
  "use strict";

  global.MC = global.MC || {};

  global.MC.FirebaseConfig = {
    apiKey: "AIzaSyAJgkVqr7p_GKnYFTSHybvBLyFGHplE_uc",
    authDomain: "jeff-2f92d.firebaseapp.com",
    projectId: "jeff-2f92d",
    storageBucket: "jeff-2f92d.firebasestorage.app",
    messagingSenderId: "337984443748",
    appId: "1:337984443748:web:86e7019aa4a5559c3b9671",
    measurementId: "G-PMQ5N15D5Y"
  };
})(window);