/*
  Nombre completo: aj-check.js
  Ruta: scripts/aj-check.js

  Función:
    - Ejecutar una verificación local de estructura para AgendaJeff.
    - Validar que los scripts referenciados por HTML existan.
    - Validar sintaxis básica de archivos JavaScript.
    - Validar reglas de prefijo para módulos Telegram, Google Calendar y Notificaciones.

  Se conecta con:
    - package.json
    - index.html
    - modulos/telegram/tl-module.html
    - modulos/googlecalendar/gc-module.html
    - modulos/notificaciones/nt-module.html
*/

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    fail(`No existe el archivo requerido: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function walkFiles(directory, output) {
  const absoluteDirectory = path.join(ROOT, directory);

  if (!fs.existsSync(absoluteDirectory)) {
    fail(`No existe el directorio requerido: ${directory}`);
    return output;
  }

  fs.readdirSync(absoluteDirectory, { withFileTypes: true }).forEach(function eachEntry(entry) {
    const absolutePath = path.join(absoluteDirectory, entry.name);
    const relativePath = toRelative(absolutePath);

    if (entry.isDirectory()) {
      walkFiles(relativePath, output);
      return;
    }

    output.push(relativePath);
  });

  return output;
}

function extractScriptSources(html) {
  const sources = [];
  const pattern = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match = pattern.exec(html);

  while (match) {
    sources.push(match[1]);
    match = pattern.exec(html);
  }

  return sources;
}

function validateHtmlScripts(htmlPath) {
  const html = readText(htmlPath);
  const htmlDir = path.dirname(htmlPath);
  const sources = extractScriptSources(html);

  sources.forEach(function eachSource(src) {
    if (/^https?:\/\//i.test(src)) {
      return;
    }

    const normalized = path.normalize(path.join(htmlDir, src)).replace(/\\/g, "/");
    const absolutePath = path.join(ROOT, normalized);

    if (!fs.existsSync(absolutePath)) {
      fail(`${htmlPath} referencia un script inexistente: ${src}`);
    }
  });
}

function validateJsSyntax(relativePath) {
  const code = readText(relativePath);

  if (!code) {
    return;
  }

  try {
    new Function(code);
  } catch (error) {
    fail(`Sintaxis inválida en ${relativePath}: ${error.message}`);
  }
}

function validatePrefix(directory, prefix, allowedRootFiles) {
  const files = walkFiles(directory, []);
  const allowed = Array.isArray(allowedRootFiles) ? allowedRootFiles : [];

  files.forEach(function eachFile(relativePath) {
    const fileName = path.basename(relativePath);
    const extension = path.extname(fileName);

    if (![".js", ".css", ".html", ".md"].includes(extension)) {
      return;
    }

    if (allowed.includes(fileName)) {
      return;
    }

    if (!fileName.startsWith(prefix)) {
      fail(`${relativePath} no cumple el prefijo requerido ${prefix}`);
    }
  });
}

function validateRequiredGoogleCalendarFiles() {
  const required = [
    "modulos/googlecalendar/gc-module.html",
    "modulos/googlecalendar/gc-module.css",
    "modulos/googlecalendar/config/gc-config.js",
    "modulos/googlecalendar/config/gc-firebase-config.js",
    "modulos/googlecalendar/config/gc-google-config.js",
    "modulos/googlecalendar/storage/gc-local-read.js",
    "modulos/googlecalendar/storage/gc-local-save.js",
    "modulos/googlecalendar/storage/gc-local-clear.js",
    "modulos/googlecalendar/firebase/gc-firebase-init.js",
    "modulos/googlecalendar/firebase/gc-firebase-read.js",
    "modulos/googlecalendar/firebase/gc-firebase-save.js",
    "modulos/googlecalendar/firebase/gc-firebase-test.js",
    "modulos/googlecalendar/auth/gc-auth-url.js",
    "modulos/googlecalendar/auth/gc-auth-desktop.js",
    "modulos/googlecalendar/auth/gc-auth-token.js",
    "modulos/googlecalendar/auth/gc-auth-refresh.js",
    "modulos/googlecalendar/api/gc-api-client.js",
    "modulos/googlecalendar/api/gc-api-calendars.js",
    "modulos/googlecalendar/api/gc-api-events-read.js",
    "modulos/googlecalendar/api/gc-api-events-create.js",
    "modulos/googlecalendar/api/gc-api-test.js",
    "modulos/googlecalendar/connection/gc-connection-status.js",
    "modulos/googlecalendar/connection/gc-connection-read.js",
    "modulos/googlecalendar/connection/gc-connection-save.js",
    "modulos/googlecalendar/connection/gc-connection-clear.js",
    "modulos/googlecalendar/connection/gc-connection-test.js",
    "modulos/googlecalendar/diagnostic/gc-diagnostic-state.js",
    "modulos/googlecalendar/diagnostic/gc-diagnostic-local.js",
    "modulos/googlecalendar/diagnostic/gc-diagnostic-firebase.js",
    "modulos/googlecalendar/diagnostic/gc-diagnostic-google.js",
    "modulos/googlecalendar/diagnostic/gc-diagnostic-report.js",
    "modulos/googlecalendar/connector/gc-connector-status.js",
    "modulos/googlecalendar/connector/gc-connector-events.js",
    "modulos/googlecalendar/connector/gc-connector-test.js",
    "modulos/googlecalendar/ui/gc-ui-dom.js",
    "modulos/googlecalendar/ui/gc-ui-render.js",
    "modulos/googlecalendar/ui/gc-ui-events.js",
    "modulos/googlecalendar/startup/gc-start.js",
    "modulos/googlecalendar/tests/gc-test-checklist.md"
  ];

  required.forEach(function eachRequired(relativePath) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
      fail(`Falta archivo Google Calendar: ${relativePath}`);
    }
  });
}

function validateRequiredNotificationFiles() {
  const required = [
    "modulos/notificaciones/nt-module.html",
    "modulos/notificaciones/nt-module.css",
    "modulos/notificaciones/config/nt-config.js",
    "modulos/notificaciones/utils/nt-normalize.js",
    "modulos/notificaciones/desktop/nt-desktop-bridge.js",
    "modulos/notificaciones/desktop/nt-desktop-send.js",
    "modulos/notificaciones/desktop/nt-desktop-test.js",
    "modulos/notificaciones/diagnostic/nt-diagnostic-state.js",
    "modulos/notificaciones/diagnostic/nt-diagnostic-report.js",
    "modulos/notificaciones/ui/nt-ui-dom.js",
    "modulos/notificaciones/ui/nt-ui-render.js",
    "modulos/notificaciones/ui/nt-ui-events.js",
    "modulos/notificaciones/startup/nt-start.js"
  ];

  required.forEach(function eachRequired(relativePath) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
      fail(`Falta archivo Notificaciones: ${relativePath}`);
    }
  });
}

function validateFirebaseConfigWarning() {
  const content = readText("modulos/googlecalendar/config/gc-firebase-config.js");
  const emptyRequired = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"].filter(function isEmptyField(field) {
    const pattern = new RegExp(`${field}:\\s*["']\\s*["']`);
    return pattern.test(content);
  });

  if (emptyRequired.length) {
    warn(`Firebase Google Calendar tiene campos vacíos: ${emptyRequired.join(", ")}`);
  }
}

function run() {
  validateHtmlScripts("index.html");
  validateHtmlScripts("modulos/telegram/tl-module.html");
  validateHtmlScripts("modulos/googlecalendar/gc-module.html");
  validateHtmlScripts("modulos/notificaciones/nt-module.html");

  walkFiles("electron", []).filter(function isJs(file) { return file.endsWith(".js"); }).forEach(validateJsSyntax);
  walkFiles("modulos/telegram", []).filter(function isJs(file) { return file.endsWith(".js"); }).forEach(validateJsSyntax);
  walkFiles("modulos/googlecalendar", []).filter(function isJs(file) { return file.endsWith(".js"); }).forEach(validateJsSyntax);
  walkFiles("modulos/notificaciones", []).filter(function isJs(file) { return file.endsWith(".js"); }).forEach(validateJsSyntax);

  validatePrefix("modulos/telegram", "tl-", []);
  validatePrefix("modulos/googlecalendar", "gc-", []);
  validatePrefix("modulos/notificaciones", "nt-", []);
  validateRequiredGoogleCalendarFiles();
  validateRequiredNotificationFiles();
  validateFirebaseConfigWarning();

  if (warnings.length) {
    console.log("AgendaJeff check - advertencias:");
    warnings.forEach(function eachWarning(message) {
      console.log(`- ${message}`);
    });
  }

  if (errors.length) {
    console.error("AgendaJeff check - errores:");
    errors.forEach(function eachError(message) {
      console.error(`- ${message}`);
    });
    process.exit(1);
  }

  console.log("AgendaJeff check OK");
}

run();