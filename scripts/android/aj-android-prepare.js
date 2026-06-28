/*
  Nombre completo: aj-android-prepare.js
  Ruta: scripts/android/aj-android-prepare.js

  Función:
    - Preparar carpeta android-web para Capacitor.
    - Copiar index.html, core, modulos y release.
    - Inyectar puente móvil para que AgendaJeff funcione sin Electron en Android.
*/

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const WEB_DIR = path.join(ROOT, "android-web");
const COPY_TARGETS = ["index.html", "core", "modulos", "release"];

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(target);
    fs.readdirSync(source).forEach(function each(entry) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    });
    return;
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyWebAssets() {
  removeDir(WEB_DIR);
  ensureDir(WEB_DIR);
  COPY_TARGETS.forEach(function each(target) {
    const source = path.join(ROOT, target);
    if (!fs.existsSync(source)) throw new Error(`No existe ${target}`);
    copyRecursive(source, path.join(WEB_DIR, target));
  });
}

function injectMobileBridge() {
  const indexPath = path.join(WEB_DIR, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const scriptTag = '  <script src="core/mobile/aj-mobile-bridge.js"></script>\n';
  if (!html.includes("core/mobile/aj-mobile-bridge.js")) {
    html = html.replace("  <script>\n", `${scriptTag}  <script>\n`);
  }
  fs.writeFileSync(indexPath, html, "utf8");
}

function writeAndroidReadme() {
  const readme = [
    "# android-web",
    "",
    "Carpeta generada automáticamente por:",
    "",
    "```bash",
    "npm run android:prepare",
    "```",
    "",
    "No editar manualmente esta carpeta. Editar `index.html`, `core/` o `modulos/` y volver a preparar Android."
  ].join("\n");
  fs.writeFileSync(path.join(WEB_DIR, "README.md"), `${readme}\n`, "utf8");
}

function run() {
  copyWebAssets();
  injectMobileBridge();
  writeAndroidReadme();
  console.log(JSON.stringify({ ok: true, webDir: WEB_DIR, message: "android-web preparado para Capacitor." }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exit(1);
}
