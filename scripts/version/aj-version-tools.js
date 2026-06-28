/*
  Nombre completo: aj-version-tools.js
  Ruta: scripts/version/aj-version-tools.js

  Función:
    - Utilidades compartidas para leer, subir versión y generar manifiestos de AgendaJeff.
*/

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PACKAGE_PATH = path.join(ROOT, "package.json");
const MANIFEST_PATH = path.join(ROOT, "release", "agenda-jeff-version.json");
const NOTES_DIR = path.join(ROOT, "release", "notes");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readPackage() {
  return readJson(PACKAGE_PATH);
}

function writePackage(pkg) {
  writeJson(PACKAGE_PATH, pkg);
}

function parseVersion(version) {
  const match = String(version || "0.0.0").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Versión inválida: ${version}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function bumpVersion(version, type) {
  const current = parseVersion(version);
  const mode = String(type || "patch").toLowerCase();

  if (/^\d+\.\d+\.\d+$/.test(mode)) return mode;
  if (mode === "major") return `${current.major + 1}.0.0`;
  if (mode === "minor") return `${current.major}.${current.minor + 1}.0`;
  if (mode === "patch") return `${current.major}.${current.minor}.${current.patch + 1}`;

  throw new Error(`Tipo de versión no soportado: ${type}`);
}

function currentDateText() {
  return new Date().toISOString().slice(0, 10);
}

function buildManifest(pkg, options) {
  const config = options && typeof options === "object" ? options : {};
  const version = pkg.version;
  const tag = `v${version}`;
  const repository = config.repository || "jeffer91/AgendaJeff";

  return {
    app: "AgendaJeff",
    packageName: pkg.name,
    version,
    tag,
    channel: config.channel || "stable",
    generatedAt: new Date().toISOString(),
    repository,
    desktop: {
      platform: "windows",
      installerName: `AgendaJeff-Setup-${version}.exe`,
      releaseUrl: `https://github.com/${repository}/releases/tag/${tag}`,
      downloadUrl: `https://github.com/${repository}/releases/download/${tag}/AgendaJeff-Setup-${version}.exe`,
      autoInstall: false,
      requiresUserConfirmation: true
    },
    android: {
      platform: "android",
      apkName: `AgendaJeff-${version}.apk`,
      releaseUrl: `https://github.com/${repository}/releases/tag/${tag}`,
      downloadUrl: `https://github.com/${repository}/releases/download/${tag}/AgendaJeff-${version}.apk`,
      autoInstall: false,
      requiresUserConfirmation: true
    },
    rules: {
      checkWhenOnline: true,
      downloadInBackground: true,
      askBeforeInstallOrRestart: true
    }
  };
}

function writeManifest(pkg, options) {
  const manifest = buildManifest(pkg, options);
  writeJson(MANIFEST_PATH, manifest);
  return manifest;
}

function writeReleaseNotes(pkg, manifest) {
  ensureDir(NOTES_DIR);
  const notesPath = path.join(NOTES_DIR, `${manifest.tag}.md`);
  const content = [
    `# AgendaJeff ${pkg.version}`,
    "",
    `Fecha: ${currentDateText()}`,
    "",
    "## Cambios principales",
    "",
    "- Validación de estructura del proyecto.",
    "- Preparación de manifiesto de versión.",
    "- Preparación de release para GitHub Releases.",
    "- Base para instalador Windows y APK Android.",
    "",
    "## Instalación",
    "",
    "- Windows: publicar el instalador EXE en GitHub Releases.",
    "- Android: publicar el APK manual en GitHub Releases.",
    "",
    "## Nota",
    "",
    "La app debe pedir confirmación antes de instalar o reiniciar."
  ].join("\n");

  fs.writeFileSync(notesPath, `${content}\n`, "utf8");
  return notesPath;
}

module.exports = Object.freeze({
  ROOT,
  PACKAGE_PATH,
  MANIFEST_PATH,
  NOTES_DIR,
  ensureDir,
  readJson,
  writeJson,
  readPackage,
  writePackage,
  parseVersion,
  bumpVersion,
  buildManifest,
  writeManifest,
  writeReleaseNotes
});
