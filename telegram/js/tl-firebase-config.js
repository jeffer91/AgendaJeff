/*
  Nombre completo: tl-firebase-config.js
  Ruta: telegram/js/tl-firebase-config.js
  Función:
    - Guardar la configuración pública de Firebase Web.
    - Separar la configuración Firebase del servicio Firestore.
  Se conecta con:
    - tl-config.js
    - tl-firebase.service.js
*/

(function initTlFirebaseConfig(global) {
  "use strict";

  global.TL = global.TL || {};

  global.TL.FirebaseConfig = {
    apiKey: "AIzaSyAJgkVqr7p_GKnYFTSHybvBLyFGHplE_uc",
    authDomain: "jeff-2f92d.firebaseapp.com",
    projectId: "jeff-2f92d",
    storageBucket: "jeff-2f92d.firebasestorage.app",
    messagingSenderId: "337984443748",
    appId: "1:337984443748:web:86e7019aa4a5559c3b9671",
    measurementId: "G-PMQ5N15D5Y"
  };
})(window);