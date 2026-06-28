/*
  Nombre completo: aj-local-read.js
  Ruta: electron/localdb/aj-local-read.js

  Función:
    - Leer la base local JSON de AgendaJeff.
    - Crear archivos base si todavía no existen.
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { getLocalPaths } = require("./aj-local-paths");
const { createDefaultData, createDefaultSettings } = require("./aj-local-defaults");
const { createOk, createError } = require("../../core/utils/aj-result");

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function ensureLocalDatabase(appInstance) {
  const paths = getLocalPaths(appInstance);
  ensureDirectory(paths.baseDir);
  ensureDirectory(paths.backupDir);

  if (!fs.existsSync(paths.dataFile)) writeJsonFile(paths.dataFile, createDefaultData());
  if (!fs.existsSync(paths.settingsFile)) writeJsonFile(paths.settingsFile, createDefaultSettings());
  if (!fs.existsSync(paths.syncQueueFile)) writeJsonFile(paths.syncQueueFile, []);
  if (!fs.existsSync(paths.indexFile)) writeJsonFile(paths.indexFile, { updatedAt: new Date().toISOString(), byDate: {}, pendingIds: [] });

  return paths;
}

function hydrateData(rawData, appInstance) {
  const paths = getLocalPaths(appInstance);
  const data = rawData && typeof rawData === "object" ? rawData : createDefaultData();

  data.items = Array.isArray(data.items) ? data.items : [];
  data.categories = Array.isArray(data.categories) ? data.categories : createDefaultData().categories;
  data.settings = data.settings && typeof data.settings === "object" ? data.settings : readJsonFile(paths.settingsFile, createDefaultSettings());
  data.syncQueue = Array.isArray(data.syncQueue) ? data.syncQueue : readJsonFile(paths.syncQueueFile, []);
  data.meta = data.meta && typeof data.meta === "object" ? data.meta : createDefaultData().meta;
  data.meta.updatedAt = data.meta.updatedAt || new Date().toISOString();

  return data;
}

function readLocalData(appInstance) {
  try {
    const paths = ensureLocalDatabase(appInstance);
    const rawData = readJsonFile(paths.dataFile, createDefaultData());
    const data = hydrateData(rawData, appInstance);

    return createOk("Base local AgendaJeff leída correctamente.", { data, paths }, { action: "localRead", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudo leer la base local AgendaJeff.", { message: error.message }, { action: "localRead", source: "electron-localdb" });
  }
}

function readSettings(appInstance) {
  try {
    const paths = ensureLocalDatabase(appInstance);
    const settings = readJsonFile(paths.settingsFile, createDefaultSettings());
    return createOk("Ajustes locales leídos correctamente.", { settings, paths }, { action: "settingsRead", source: "electron-localdb" });
  } catch (error) {
    return createError("No se pudieron leer los ajustes locales.", { message: error.message }, { action: "settingsRead", source: "electron-localdb" });
  }
}

module.exports = Object.freeze({ ensureLocalDatabase, readLocalData, readSettings, readJsonFile, writeJsonFile });
