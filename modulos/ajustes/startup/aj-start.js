/*
  Nombre completo: aj-start.js
  Ruta: modulos/ajustes/startup/aj-start.js

  Función:
    - Iniciar pantalla Ajustes.
    - Leer y guardar preferencias en base local JSON.
    - Controlar segundo plano y búsqueda de actualizaciones.
*/

(function initAjustesModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const ajustes = root.Ajustes = root.Ajustes || {};

  const state = {
    started: false,
    startedAt: "",
    lastSettingsResult: null,
    lastBackgroundResult: null,
    lastUpdateResult: null
  };

  function getBridge() {
    try {
      if (global.AgendaJeffElectron) return global.AgendaJeffElectron;
      if (global.parent && global.parent.AgendaJeffElectron) return global.parent.AgendaJeffElectron;
    } catch (error) { return null; }
    return null;
  }

  function getElement(id) { return global.document ? global.document.getElementById(id) : null; }
  function setText(id, value) { const element = getElement(id); if (element) element.textContent = value == null ? "" : String(value); }
  function setChecked(id, value) { const element = getElement(id); if (element) element.checked = Boolean(value); }

  function readSettingsDraft() {
    return {
      runInBackground: getElement("ajRunInBackground") ? getElement("ajRunInBackground").checked : true,
      askStartWindows: getElement("ajAskStartWindows") ? getElement("ajAskStartWindows").checked : true,
      lowResourceMode: getElement("ajLowResourceMode") ? getElement("ajLowResourceMode").checked : true,
      autoUpdate: getElement("ajAutoUpdate") ? getElement("ajAutoUpdate").checked : true,
      confirmInstall: getElement("ajConfirmInstall") ? getElement("ajConfirmInstall").checked : true
    };
  }

  function applySettings(settings) {
    const data = settings && typeof settings === "object" ? settings : {};
    setChecked("ajRunInBackground", data.runInBackground !== false);
    setChecked("ajAskStartWindows", data.askStartWindows !== false);
    setChecked("ajLowResourceMode", data.lowResourceMode !== false);
    setChecked("ajAutoUpdate", data.autoUpdate !== false);
    setChecked("ajConfirmInstall", data.confirmInstall !== false);
  }

  function renderBackgroundStatus(result) {
    const data = result && result.data ? result.data : {};
    setText("ajBgRunning", data.running ? "Activo" : "Inactivo");
    setText("ajBgPaused", data.paused ? "Sí" : "No");
    setText("ajBgLastRun", data.lastRunAt || "Sin revisión");
    setText("ajBgNextRun", data.nextRunAt || "Sin programar");
  }

  function renderUpdateStatus(result) {
    const data = result && typeof result === "object" ? result : {};
    setText("ajUpdateLocal", data.localVersion || "...");
    setText("ajUpdateRemote", data.remoteVersion || "...");
    setText("ajUpdateState", data.message || "Sin revisar");
  }

  function renderState(extra) {
    const output = getElement("ajResultBox");
    if (!output) return;
    output.textContent = JSON.stringify({
      ok: true,
      module: "ajustes",
      message: "Ajustes conectados a base local, segundo plano y actualización.",
      settingsDraft: readSettingsDraft(),
      lastSettingsResult: state.lastSettingsResult,
      lastBackgroundResult: state.lastBackgroundResult,
      lastUpdateResult: state.lastUpdateResult,
      extra: extra || null,
      checkedAt: new Date().toISOString()
    }, null, 2);
  }

  async function saveSettings() {
    const bridge = getBridge();
    const draft = readSettingsDraft();
    if (!bridge || typeof bridge.saveAgendaSettings !== "function") {
      state.lastSettingsResult = { ok: false, message: "Puente Electron no disponible." };
      renderState();
      return state.lastSettingsResult;
    }
    state.lastSettingsResult = await bridge.saveAgendaSettings(draft);
    renderState();
    return state.lastSettingsResult;
  }

  async function loadSettings() {
    const bridge = getBridge();
    if (!bridge || typeof bridge.readAgendaSettings !== "function") {
      state.lastSettingsResult = { ok: false, message: "Puente Electron no disponible." };
      renderState();
      return state.lastSettingsResult;
    }
    const result = await bridge.readAgendaSettings();
    state.lastSettingsResult = result;
    if (result && result.ok && result.data && result.data.settings) applySettings(result.data.settings);
    renderState({ loaded: true });
    return result;
  }

  async function runBackgroundAction(actionName) {
    const bridge = getBridge();
    const actions = { status: "getBackgroundStatus", start: "startBackground", pause: "pauseBackground", resume: "resumeBackground", check: "checkBackgroundNow" };
    const method = actions[actionName];
    if (!bridge || !method || typeof bridge[method] !== "function") {
      state.lastBackgroundResult = { ok: false, message: "Control de segundo plano no disponible." };
      renderBackgroundStatus(state.lastBackgroundResult);
      renderState();
      return state.lastBackgroundResult;
    }
    state.lastBackgroundResult = await bridge[method]();
    renderBackgroundStatus(state.lastBackgroundResult);
    renderState({ backgroundAction: actionName });
    return state.lastBackgroundResult;
  }

  async function checkUpdates() {
    const core = global.AgendaJeffCore || {};
    if (!core.Updater || typeof core.Updater.checkForUpdates !== "function") {
      state.lastUpdateResult = { ok: false, message: "Módulo de actualización no disponible." };
      renderUpdateStatus(state.lastUpdateResult);
      renderState();
      return state.lastUpdateResult;
    }
    try {
      state.lastUpdateResult = await core.Updater.checkForUpdates();
    } catch (error) {
      state.lastUpdateResult = { ok: false, message: error && error.message ? error.message : "No se pudo buscar actualización." };
    }
    renderUpdateStatus(state.lastUpdateResult);
    renderState({ updateCheck: true });
    return state.lastUpdateResult;
  }

  function attachEvents() {
    ["ajRunInBackground", "ajAskStartWindows", "ajLowResourceMode", "ajAutoUpdate", "ajConfirmInstall"].forEach(function eachId(id) {
      const element = getElement(id);
      if (element) element.addEventListener("change", saveSettings);
    });
    const buttons = { ajBtnBgStatus: "status", ajBtnBgStart: "start", ajBtnBgPause: "pause", ajBtnBgResume: "resume", ajBtnBgCheck: "check" };
    Object.keys(buttons).forEach(function eachButton(id) {
      const element = getElement(id);
      if (element) element.addEventListener("click", function handleClick() { runBackgroundAction(buttons[id]); });
    });
    const updateButton = getElement("ajBtnUpdateCheck");
    if (updateButton) updateButton.addEventListener("click", checkUpdates);
  }

  async function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attachEvents();
    await loadSettings();
    await runBackgroundAction("status");
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      settingsDraft: readSettingsDraft(),
      lastSettingsResult: state.lastSettingsResult,
      lastBackgroundResult: state.lastBackgroundResult,
      lastUpdateResult: state.lastUpdateResult
    };
  }

  if (!global.document || global.document.readyState !== "loading") start();
  else global.document.addEventListener("DOMContentLoaded", start, { once: true });

  ajustes.start = start;
  ajustes.getState = getState;
  ajustes.readSettingsDraft = readSettingsDraft;
  ajustes.saveSettings = saveSettings;
  ajustes.loadSettings = loadSettings;
  ajustes.runBackgroundAction = runBackgroundAction;
  ajustes.checkUpdates = checkUpdates;
})(window);
