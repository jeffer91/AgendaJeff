/*
  Nombre completo: aj-version-bump.js
  Ruta: scripts/version/aj-version-bump.js

  Uso:
    node scripts/version/aj-version-bump.js patch
    node scripts/version/aj-version-bump.js minor
    node scripts/version/aj-version-bump.js major
    node scripts/version/aj-version-bump.js 1.2.3
*/

"use strict";

const tools = require("./aj-version-tools");

function run() {
  const mode = process.argv[2] || "patch";
  const pkg = tools.readPackage();
  const oldVersion = pkg.version;
  const newVersion = tools.bumpVersion(oldVersion, mode);

  pkg.version = newVersion;
  pkg.agendaJeff = pkg.agendaJeff || {};
  pkg.agendaJeff.versionado = {
    ultimaVersionAnterior: oldVersion,
    ultimaVersionNueva: newVersion,
    actualizadoEn: new Date().toISOString()
  };

  tools.writePackage(pkg);
  const manifest = tools.writeManifest(pkg, { channel: "stable" });
  const notesPath = tools.writeReleaseNotes(pkg, manifest);

  console.log(JSON.stringify({ ok: true, oldVersion, newVersion, manifest: tools.MANIFEST_PATH, notes: notesPath }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exit(1);
}
