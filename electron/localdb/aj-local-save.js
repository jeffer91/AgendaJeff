/*
  Nombre completo: aj-local-save.js
  Ruta: electron/localdb/aj-local-save.js

  Función:
    - Guardar la base local JSON de AgendaJeff de forma atómica.
    - Guardar ajustes locales separados para lectura rápida.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { getLocalPaths } = require("./aj-local-paths");
const { ensureLocalDatabase, readLocalData, writeJsonFile } = require("./aj-local-read");
const { createDefaultSettings } = require("./aj-local-defaults");
const { createOk, createError } = require("../../core/utils/aj-result");

function atomicWriteJson(filePath, data) {
  const temporaryPath = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function saveLocalData(appInstance, data) {
  try {
    const paths = ensureLocalDatabase(appInstance);
    const safeData = data && typeof data === "object" ? data : {};
    safeData.meta = safeData.meta && typeof safeData.meta === "object" ? safeData.meta : {};
    safeData.meta.updatedAt = new Date().toISOString();
    safeData.items = Array.isArray(safeData.items) ? safeData.items : [];
    safeData.categories = Array.isArray(safeData.categories) ? safeData.categories : [];
    safeData.settings = safeData.settings && typeof safeData.settings === "object" ? safeData.settings : createDefaultSettings();
    safeData.syncQueue = Array.isArray(safeData.syncQueue) ? safeData.syncQueue : [];

    atomicWriteJson(paths.dataFile, safeData);
    atomicWriteJson(paths.settingsFile, safeData.settings);
    atomicWriteJson(paths.syncQueueFile, safeData.syncQueue);

    return createOk("Base local AgendaJeff guardada correctamente.", { data: safeData, paths }, { action: "localSave", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudo guardar la base local AgendaJeff.", { message: error.message }, { action: "localSave", source: "electron-localdb" });
  }
}

function saveSettings(appInstance, settings) {
  try {
    const paths = ensureLocalDatabase(appInstance);
    const currentResult = readLocalData(appInstance);
    const currentData = currentResult.ok && currentResult.data ? currentResult.data.data : {};
    const currentSettings = currentData.settings && typeof currentData.settings === "object" ? currentData.settings : createDefaultSettings();
    const nextSettings = {
      ...currentSettings,
      ...(settings && typeof settings === "object" ? settings : {}),
      updatedAt: new Date().toISOString()
    };

    currentData.settings = nextSettings;
    writeJsonFile(paths.settingsFile, nextSettings);
    saveLocalData(appInstance, currentData);

    return createOk("Ajustes locales guardados correctamente.", { settings: nextSettings, paths }, { action: "settingsSave", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudieron guardar los ajustes locales.", { message: error.message }, { action: "settingsSave", source: "electron-localdb" });
  }
}

module.exports = Object.freeze({ saveLocalData, saveSettings, atomicWriteJson });
