/*
  Nombre completo: aj-update-check.js
  Ruta: core/updater/aj-update-check.js

  Función:
    - Comparar versión local contra manifiesto remoto.
    - No instala automáticamente; solo informa y pide confirmación desde la interfaz.
*/

(function initAgendaJeffUpdateCheck(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const updater = core.Updater = core.Updater || {};

  function parse(version) {
    return String(version || "0.0.0").split(".").map(function toNumber(part) { return Number(part || 0); });
  }

  function compareVersions(localVersion, remoteVersion) {
    const local = parse(localVersion);
    const remote = parse(remoteVersion);
    for (let index = 0; index < 3; index += 1) {
      if ((remote[index] || 0) > (local[index] || 0)) return 1;
      if ((remote[index] || 0) < (local[index] || 0)) return -1;
    }
    return 0;
  }

  async function fetchRemoteManifest(url) {
    const response = await fetch(url || updater.config.githubManifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo leer manifiesto remoto: ${response.status}`);
    return response.json();
  }

  async function getLocalVersion() {
    const bridge = global.AgendaJeffElectron || (global.parent && global.parent.AgendaJeffElectron) || null;
    if (bridge && typeof bridge.getEnvironment === "function") {
      const env = await bridge.getEnvironment();
      return env && env.app && env.app.version ? env.app.version : "0.0.0";
    }
    return "0.0.0";
  }

  async function checkForUpdates() {
    const localVersion = await getLocalVersion();
    const remote = await fetchRemoteManifest();
    const compare = compareVersions(localVersion, remote.version);
    const hasUpdate = compare > 0;

    return {
      ok: true,
      action: "checkForUpdates",
      localVersion,
      remoteVersion: remote.version,
      hasUpdate,
      manifest: remote,
      message: hasUpdate ? "Hay una versión nueva disponible." : "AgendaJeff está actualizado.",
      checkedAt: new Date().toISOString()
    };
  }

  updater.compareVersions = compareVersions;
  updater.fetchRemoteManifest = fetchRemoteManifest;
  updater.checkForUpdates = checkForUpdates;
})(window);
