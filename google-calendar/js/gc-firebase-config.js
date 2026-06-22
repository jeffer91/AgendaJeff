/*
  Nombre completo: gc-firebase-config.js
  Ruta: google-calendar/js/gc-firebase-config.js
  Función:
    - Guardar la configuración pública de Firebase Web.
    - Separar la configuración Firebase del servicio Firestore.
    - Permitir que Google Calendar guarde su estado en Firestore.
  Se conecta con:
    - gc-config.js
    - gc-firebase.service.js

  Proyecto Firebase:
    - projectId: jeff-2f92d

  Importante:
    - Este archivo es independiente del módulo Telegram.
    - Este archivo usa window.GC, no window.TL.
*/

(function initGcFirebaseConfig(global) {
  "use strict";

  global.GC = global.GC || {};

  global.GC.FirebaseConfig = {
    apiKey: "AIzaSyAJgkVqr7p_GKnYFTSHybvBLyFGHplE_uc",
    authDomain: "jeff-2f92d.firebaseapp.com",
    projectId: "jeff-2f92d",
    storageBucket: "jeff-2f92d.firebasestorage.app",
    messagingSenderId: "337984443748",
    appId: "1:337984443748:web:86e7019aa4a5559c3b9671",
    measurementId: "G-PMQ5N15D5Y"
  };
})(window);