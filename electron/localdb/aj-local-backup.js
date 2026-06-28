/*
  Nombre completo: aj-local-backup.js
  Ruta: electron/localdb/aj-local-backup.js

  Función:
    - Crear respaldos JSON de la base local de AgendaJeff.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { getLocalPaths } = require("./aj-local-paths");
const { ensureLocalDatabase, readLocalData } = require("./aj-local-read");
const { createOk, createError } = require("../../core/utils/aj-result");

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function createLocalBackup(appInstance) {
  try {
    const paths = ensureLocalDatabase(appInstance);
    const readResult = readLocalData(appInstance);
    if (!readResult.ok) return readResult;

    fs.mkdirSync(paths.backupDir, { recursive: true });
    const backupFile = path.join(paths.backupDir, `agenda-backup-${safeTimestamp()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(readResult.data.data, null, 2), "utf8");

    return createOk("Respaldo local creado correctamente.", { backupFile, paths }, { action: "localBackup", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudo crear el respaldo local.", { message: error.message }, { action: "localBackup", source: "electron-localdb" });
  }
}

module.exports = Object.freeze({ createLocalBackup });
