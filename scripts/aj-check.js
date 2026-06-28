/*
  Nombre completo: aj-check.js
  Ruta: scripts/aj-check.js

  Función:
    - Verificar estructura, scripts HTML, sintaxis JS y prefijos de AgendaJeff.
*/

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, "/"); }
function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) {
  const target = path.join(ROOT, file);
  if (!fs.existsSync(target)) { fail(`No existe el archivo requerido: ${file}`); return ""; }
  return fs.readFileSync(target, "utf8");
}
function walk(dir, out) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) { fail(`No existe el directorio requerido: ${dir}`); return out; }
  fs.readdirSync(absolute, { withFileTypes: true }).forEach(function each(entry) {
    const full = path.join(absolute, entry.name);
    const relative = rel(full);
    if (entry.isDirectory()) walk(relative, out);
    else out.push(relative);
  });
  return out;
}
function required(label, files) {
  files.forEach(function each(file) { if (!exists(file)) fail(`Falta archivo ${label}: ${file}`); });
}
function htmlScripts(htmlPath) {
  const content = read(htmlPath);
  const dir = path.dirname(htmlPath);
  const pattern = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match = pattern.exec(content);
  while (match) {
    const src = match[1];
    if (!/^https?:\/\//i.test(src)) {
      const target = path.normalize(path.join(dir, src)).replace(/\\/g, "/");
      if (!exists(target)) fail(`${htmlPath} referencia un script inexistente: ${src}`);
    }
    match = pattern.exec(content);
  }
}
function jsSyntax(file) {
  const code = read(file);
  if (!code) return;
  try { new Function(code); } catch (error) { fail(`Sintaxis inválida en ${file}: ${error.message}`); }
}
function prefix(dir, pref) {
  walk(dir, []).forEach(function each(file) {
    const name = path.basename(file);
    const ext = path.extname(name);
    if (![".js", ".css", ".html", ".md"].includes(ext)) return;
    if (!name.startsWith(pref)) fail(`${file} no cumple el prefijo requerido ${pref}`);
  });
}

function validateScreens() {
  required("Inicio", ["modulos/inicio/in-module.html", "modulos/inicio/in-module.css", "modulos/inicio/dom/in-dom.js", "modulos/inicio/render/in-summary.js", "modulos/inicio/render/in-render.js", "modulos/inicio/actions/in-actions.js", "modulos/inicio/startup/in-start.js"]);
  required("Agenda", ["modulos/agenda/ag-module.html", "modulos/agenda/ag-module.css", "modulos/agenda/ag-crud.css", "modulos/agenda/form/ag-form-dom.js", "modulos/agenda/form/ag-form-read.js", "modulos/agenda/form/ag-form-fill.js", "modulos/agenda/list/ag-list-render.js", "modulos/agenda/list/ag-list-events.js", "modulos/agenda/startup/ag-start.js", "modulos/agenda/startup/ag-start-v2.js"]);
  required("Carga Masiva", ["modulos/carga/cm-module.html", "modulos/carga/cm-module.css", "modulos/carga/cm-review.css", "modulos/carga/dom/cm-dom.js", "modulos/carga/sources/cm-source-manager.js", "modulos/carga/parser/cm-date-parser.js", "modulos/carga/parser/cm-event-parser.js", "modulos/carga/parser/cm-duplicate.js", "modulos/carga/review/cm-review-render.js", "modulos/carga/review/cm-review-actions.js", "modulos/carga/startup/cm-start.js", "modulos/carga/startup/cm-start-v2.js"]);
  required("Ajustes", ["modulos/ajustes/aj-module.html", "modulos/ajustes/aj-module.css", "modulos/ajustes/startup/aj-start.js"]);
  required("Diagnóstico", ["modulos/diagnostico/dg-module.html", "modulos/diagnostico/dg-module.css", "modulos/diagnostico/dom/dg-dom.js", "modulos/diagnostico/services/dg-collector.js", "modulos/diagnostico/render/dg-render.js", "modulos/diagnostico/startup/dg-start.js"]);
}

function validateCore() {
  required("Core", ["core/config/aj-core-config.js", "core/models/aj-event-model.js", "core/models/aj-reminder-model.js", "core/models/aj-pending-model.js", "core/models/aj-category-model.js", "core/models/aj-sync-model.js", "core/utils/aj-id.js", "core/utils/aj-date.js", "core/utils/aj-result.js", "core/integrations/aj-service-bridge.js", "core/integrations/aj-firebase-adapter.js", "core/integrations/aj-telegram-adapter.js", "core/integrations/aj-google-adapter.js", "core/integrations/aj-notification-adapter.js", "core/sync/aj-sync-orchestrator.js", "core/updater/aj-update-config.js", "core/updater/aj-update-check.js", "core/mobile/aj-mobile-bridge.js"]);
  required("Base local", ["electron/localdb/aj-local-paths.js", "electron/localdb/aj-local-defaults.js", "electron/localdb/aj-local-read.js", "electron/localdb/aj-local-save.js", "electron/localdb/aj-local-index.js", "electron/localdb/aj-local-backup.js", "electron/localdb/aj-local-ipc.js"]);
  required("Segundo plano", ["electron/background/aj-background-pending.js", "electron/background/aj-background-reminders.js", "electron/background/aj-background-scheduler.js", "electron/background/aj-background-runner.js", "electron/background/aj-background-notify.js", "electron/tray/aj-tray-menu.js", "electron/tray/aj-tray.js"]);
  required("Release", ["release/agenda-jeff-version.json", "release/notes/v0.0.1.md", "scripts/version/aj-version-tools.js", "scripts/version/aj-version-bump.js", "scripts/release/aj-release-prepare.js", "scripts/build/aj-build-guard.js", "scripts/windows/aj-release.bat"]);
  required("Android", ["capacitor.config.json", "scripts/android/aj-android-prepare.js", "scripts/android/aj-android-check.js", "scripts/windows/aj-android-apk.bat", "docs/android/aj-android-guia.md"]);
}

function validateConnections() {
  required("Google Calendar", ["modulos/googlecalendar/gc-module.html", "modulos/googlecalendar/gc-module.css", "modulos/googlecalendar/config/gc-config.js", "modulos/googlecalendar/config/gc-firebase-config.js", "modulos/googlecalendar/config/gc-google-config.js", "modulos/googlecalendar/connector/gc-connector-status.js", "modulos/googlecalendar/connector/gc-connector-events.js", "modulos/googlecalendar/connector/gc-connector-test.js", "modulos/googlecalendar/startup/gc-start.js"]);
  required("Notificaciones", ["modulos/notificaciones/nt-module.html", "modulos/notificaciones/nt-module.css", "modulos/notificaciones/config/nt-config.js", "modulos/notificaciones/startup/nt-start.js"]);
  required("Telegram", ["modulos/telegram/tl-module.html", "modulos/telegram/tl-module.css", "modulos/telegram/startup/tl-start.js"]);
}

function validateHtml() {
  ["index.html", "modulos/inicio/in-module.html", "modulos/agenda/ag-module.html", "modulos/carga/cm-module.html", "modulos/ajustes/aj-module.html", "modulos/diagnostico/dg-module.html", "modulos/telegram/tl-module.html", "modulos/googlecalendar/gc-module.html", "modulos/notificaciones/nt-module.html"].forEach(htmlScripts);
}
function validateSyntax() {
  ["core", "electron", "modulos/inicio", "modulos/agenda", "modulos/carga", "modulos/ajustes", "modulos/diagnostico", "modulos/telegram", "modulos/googlecalendar", "modulos/notificaciones", "scripts"].forEach(function each(dir) {
    walk(dir, []).filter(function isJs(file) { return file.endsWith(".js"); }).forEach(jsSyntax);
  });
}
function validatePrefixes() {
  prefix("core", "aj-");
  prefix("electron/localdb", "aj-");
  prefix("electron/background", "aj-");
  prefix("electron/tray", "aj-");
  prefix("modulos/inicio", "in-");
  prefix("modulos/agenda", "ag-");
  prefix("modulos/carga", "cm-");
  prefix("modulos/ajustes", "aj-");
  prefix("modulos/diagnostico", "dg-");
  prefix("modulos/telegram", "tl-");
  prefix("modulos/googlecalendar", "gc-");
  prefix("modulos/notificaciones", "nt-");
}
function validateFirebaseWarning() {
  const content = read("modulos/googlecalendar/config/gc-firebase-config.js");
  const empty = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"].filter(function hasEmpty(field) {
    return new RegExp(`${field}:\\s*["']\\s*["']`).test(content);
  });
  if (empty.length) warn(`Firebase Google Calendar tiene campos vacíos: ${empty.join(", ")}`);
}

function run() {
  validateHtml();
  validateSyntax();
  validatePrefixes();
  validateScreens();
  validateCore();
  validateConnections();
  validateFirebaseWarning();

  if (warnings.length) {
    console.log("AgendaJeff check - advertencias:");
    warnings.forEach(function each(message) { console.log(`- ${message}`); });
  }
  if (errors.length) {
    console.error("AgendaJeff check - errores:");
    errors.forEach(function each(message) { console.error(`- ${message}`); });
    process.exit(1);
  }
  console.log("AgendaJeff check OK");
}

run();
