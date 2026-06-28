/*
  Nombre completo: aj-start.js
  Ruta: modulos/ajustes/startup/aj-start.js

  Función:
    - Iniciar pantalla Ajustes.
    - Leer y guardar preferencias base en la base local JSON cuando Electron esté disponible.
*/

(function initAjustesModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const ajustes = root.Ajustes = root.Ajustes || {};

  const state = {
    started: false,
    startedAt: "",
    lastSettingsResult: null
  };

  function getBridge() {
    try {
      if (global.AgendaJeffElectron) return global.AgendaJeffElectron;
      if (global.parent && global.parent.AgendaJeffElectron) return global.parent.AgendaJeffElectron;
    } catch (error) {
      return null;
    }
    return null;
  }

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function setChecked(id, value) {
    const element = getElement(id);
    if (element) element.checked = Boolean(value);
  }

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

  function renderState(extra) {
    const output = getElement("ajResultBox");
    if (!output) return;

    output.textContent = JSON.stringify({
      ok: true,
      module: "ajustes",
      message: "Ajustes conectados a base local JSON cuando Electron está disponible.",
      settingsDraft: readSettingsDraft(),
      lastSettingsResult: state.lastSettingsResult,
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

    if (result && result.ok && result.data && result.data.settings) {
      applySettings(result.data.settings);
    }

    renderState({ loaded: true });
    return result;
  }

  function attachEvents() {
    ["ajRunInBackground", "ajAskStartWindows", "ajLowResourceMode", "ajAutoUpdate", "ajConfirmInstall"].forEach(function eachId(id) {
      const element = getElement(id);
      if (element) element.addEventListener("change", saveSettings);
    });
  }

  async function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attachEvents();
    await loadSettings();
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      settingsDraft: readSettingsDraft(),
      lastSettingsResult: state.lastSettingsResult
    };
  }

  function autoStart() {
    if (!global.document || global.document.readyState !== "loading") {
      start();
      return;
    }

    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  ajustes.start = start;
  ajustes.getState = getState;
  ajustes.readSettingsDraft = readSettingsDraft;
  ajustes.saveSettings = saveSettings;
  ajustes.loadSettings = loadSettings;
  autoStart();
})(window);
