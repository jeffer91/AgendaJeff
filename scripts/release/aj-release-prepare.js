/*
  Nombre completo: aj-release-prepare.js
  Ruta: scripts/release/aj-release-prepare.js

  Función:
    - Preparar una versión para publicación.
    - Ejecutar verificación, generar manifiesto y notas de release.
*/

"use strict";

const { spawnSync } = require("child_process");
const tools = require("../version/aj-version-tools");

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: tools.ROOT,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`Comando falló: ${command} ${args.join(" ")}`);
  }
}

function run() {
  const pkg = tools.readPackage();

  console.log("AgendaJeff release prepare");
  console.log(`Versión actual: ${pkg.version}`);

  runCommand("npm", ["run", "check"]);

  const manifest = tools.writeManifest(pkg, { channel: "stable" });
  const notesPath = tools.writeReleaseNotes(pkg, manifest);

  console.log(JSON.stringify({
    ok: true,
    version: pkg.version,
    tag: manifest.tag,
    manifest: tools.MANIFEST_PATH,
    notes: notesPath,
    next: [
      "npm run build:win",
      `Crear release ${manifest.tag} en GitHub Releases`,
      `Subir ${manifest.desktop.installerName}`,
      `Subir ${manifest.android.apkName} cuando exista APK`
    ]
  }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exit(1);
}
