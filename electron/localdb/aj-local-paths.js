/*
  Nombre completo: aj-local-paths.js
  Ruta: electron/localdb/aj-local-paths.js

  Función:
    - Definir rutas internas seguras para la base local JSON de AgendaJeff.
*/

"use strict";

const path = require("path");

function getBaseDir(appInstance) {
  const appData = appInstance && typeof appInstance.getPath === "function"
    ? appInstance.getPath("userData")
    : process.cwd();

  return path.join(appData, "agenda-local");
}

function getLocalPaths(appInstance) {
  const baseDir = getBaseDir(appInstance);

  return {
    baseDir,
    dataFile: path.join(baseDir, "agenda-data.json"),
    indexFile: path.join(baseDir, "agenda-index.json"),
    settingsFile: path.join(baseDir, "agenda-settings.json"),
    syncQueueFile: path.join(baseDir, "agenda-sync-queue.json"),
    backupDir: path.join(baseDir, "backups")
  };
}

module.exports = Object.freeze({ getBaseDir, getLocalPaths });
