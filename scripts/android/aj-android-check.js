/*
  Nombre completo: aj-android-check.js
  Ruta: scripts/android/aj-android-check.js

  Función:
    - Verificar si el proyecto está preparado para generar APK Android con Capacitor.
*/

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const REQUIRED = [
  "capacitor.config.json",
  "core/mobile/aj-mobile-bridge.js",
  "scripts/android/aj-android-prepare.js",
  "android-web/index.html"
];

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readPackage() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
}

function run() {
  const pkg = readPackage();
  const missing = REQUIRED.filter(function filterMissing(file) { return !exists(file); });
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const missingPackages = ["@capacitor/core", "@capacitor/cli", "@capacitor/android"].filter(function filterPkg(name) { return !deps[name]; });

  const result = {
    ok: missing.length === 0 && missingPackages.length === 0,
    missingFiles: missing,
    missingPackages,
    hasAndroidNativeProject: exists("android"),
    next: []
  };

  if (missing.includes("android-web/index.html")) result.next.push("npm run android:prepare");
  if (missingPackages.length) result.next.push("npm install");
  if (!result.hasAndroidNativeProject) result.next.push("npx cap add android");
  result.next.push("npx cap sync android");
  result.next.push("cd android && gradlew assembleDebug");

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

run();
