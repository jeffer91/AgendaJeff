/*
  Nombre completo: aj-build-guard.js
  Ruta: scripts/build/aj-build-guard.js

  Función:
    - Verificar que el proyecto esté listo antes de construir instalador.
    - No compila por sí solo; evita builds sin manifiesto o sin verificación.
*/

"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");
const tools = require("../version/aj-version-tools");

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: tools.ROOT,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) throw new Error(`Falló ${command} ${args.join(" ")}`);
}

function run() {
  const pkg = tools.readPackage();

  runCommand("npm", ["run", "check"]);

  if (!fs.existsSync(tools.MANIFEST_PATH)) {
    tools.writeManifest(pkg, { channel: "stable" });
  }

  console.log(JSON.stringify({
    ok: true,
    message: "Proyecto listo para build.",
    version: pkg.version,
    manifest: tools.MANIFEST_PATH
  }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exit(1);
}
