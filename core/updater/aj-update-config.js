/*
  Nombre completo: aj-update-config.js
  Ruta: core/updater/aj-update-config.js

  Función:
    - Configuración común para detectar actualizaciones de AgendaJeff.
*/

(function initAgendaJeffUpdateConfig(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const updater = core.Updater = core.Updater || {};

  updater.config = Object.freeze({
    manifestPath: "release/agenda-jeff-version.json",
    githubManifestUrl: "https://raw.githubusercontent.com/jeffer91/AgendaJeff/main/release/agenda-jeff-version.json",
    checkWhenOnline: true,
    downloadInBackground: true,
    askBeforeInstallOrRestart: true,
    desktopPlatform: "windows",
    androidPlatform: "android"
  });
})(window);
