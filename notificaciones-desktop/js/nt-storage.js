/*
  Nombre completo: nt-storage.js
  Ruta: notificaciones-desktop/js/nt-storage.js
  Función:
    - Guardar configuración local del módulo Notificaciones Desktop en localStorage.
    - Leer configuración local.
    - Borrar configuración local.
    - Normalizar datos para evitar que la app falle si localStorage tiene basura.
    - Mantener el módulo usable aunque Firebase no cargue.

  Se conecta con:
    - nt-config.js
    - nt-firebase.service.js
    - nt-environment.service.js
    - nt-index.html
*/

(function initNtStorage(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function safeJsonParse(rawValue) {
    try {
      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      return null;
    }
  }

  function normalizeSettings(input) {
    const source = Utils.isPlainObject(input) ? input : {};
    const defaults = Utils.cloneDefaultSettings();

    return {
      configured: Utils.toBoolean(source.configured, defaults.configured),

      desktopNotificationsEnabled: Utils.toBoolean(
        source.desktopNotificationsEnabled,
        defaults.desktopNotificationsEnabled
      ),

      trayEnabled: Utils.toBoolean(
        source.trayEnabled,
        defaults.trayEnabled
      ),

      soundEnabled: Utils.toBoolean(
        source.soundEnabled,
        defaults.soundEnabled
      ),

      remindersEnabled: Utils.toBoolean(
        source.remindersEnabled,
        defaults.remindersEnabled
      ),

      environmentMode: Utils.normalizeEnvironmentMode(
        source.environmentMode || defaults.environmentMode
      ),

      electronAvailable: Utils.toBoolean(
        source.electronAvailable,
        defaults.electronAvailable
      ),

      webNotificationsSupported: Utils.toBoolean(
        source.webNotificationsSupported,
        defaults.webNotificationsSupported
      ),

      webNotificationsPermission: Utils.normalizePermission(
        source.webNotificationsPermission || defaults.webNotificationsPermission
      ),

      originMode: Utils.cleanString(
        source.originMode || defaults.originMode
      ),

      lastTestAt: Utils.cleanString(source.lastTestAt),
      lastTestType: Utils.cleanString(source.lastTestType),
      lastTestStatus: Utils.cleanString(source.lastTestStatus),
      lastErrorMessage: Utils.cleanString(source.lastErrorMessage),

      updatedAt: Utils.cleanString(source.updatedAt),
      source: Utils.cleanString(source.source || CONFIG.DEFAULT_SOURCE)
    };
  }

  function readSettings() {
    const rawValue = global.localStorage.getItem(CONFIG.STORAGE_KEY);
    const parsed = safeJsonParse(rawValue);

    return normalizeSettings(parsed);
  }

  function saveSettings(settings) {
    const normalized = normalizeSettings({
      ...settings,
      configured: true,
      updatedAt: Utils.nowIso(),
      source: CONFIG.DEFAULT_SOURCE
    });

    global.localStorage.setItem(
      CONFIG.STORAGE_KEY,
      JSON.stringify(normalized, null, 2)
    );

    return normalized;
  }

  function updateSettings(partialSettings) {
    const currentSettings = readSettings();

    return saveSettings({
      ...currentSettings,
      ...(Utils.isPlainObject(partialSettings) ? partialSettings : {})
    });
  }

  function clearSettings() {
    global.localStorage.removeItem(CONFIG.STORAGE_KEY);

    return normalizeSettings({});
  }

  function createSettingsFromInputs() {
    const desktopNotificationsEnabled = document.getElementById(
      "ntDesktopNotificationsEnabled"
    );

    const trayEnabled = document.getElementById("ntTrayEnabled");
    const soundEnabled = document.getElementById("ntSoundEnabled");
    const remindersEnabled = document.getElementById("ntRemindersEnabled");

    return normalizeSettings({
      configured: true,
      desktopNotificationsEnabled: desktopNotificationsEnabled
        ? desktopNotificationsEnabled.checked
        : true,
      trayEnabled: trayEnabled ? trayEnabled.checked : true,
      soundEnabled: soundEnabled ? soundEnabled.checked : true,
      remindersEnabled: remindersEnabled ? remindersEnabled.checked : true,
      updatedAt: Utils.nowIso(),
      source: CONFIG.DEFAULT_SOURCE
    });
  }

  function writeSettingsToInputs(settings) {
    const normalized = normalizeSettings(settings);

    const desktopNotificationsEnabled = document.getElementById(
      "ntDesktopNotificationsEnabled"
    );

    const trayEnabled = document.getElementById("ntTrayEnabled");
    const soundEnabled = document.getElementById("ntSoundEnabled");
    const remindersEnabled = document.getElementById("ntRemindersEnabled");

    if (desktopNotificationsEnabled) {
      desktopNotificationsEnabled.checked = normalized.desktopNotificationsEnabled;
    }

    if (trayEnabled) {
      trayEnabled.checked = normalized.trayEnabled;
    }

    if (soundEnabled) {
      soundEnabled.checked = normalized.soundEnabled;
    }

    if (remindersEnabled) {
      remindersEnabled.checked = normalized.remindersEnabled;
    }

    return normalized;
  }

  NT.Storage = {
    normalizeSettings,
    readSettings,
    saveSettings,
    updateSettings,
    clearSettings,
    createSettingsFromInputs,
    writeSettingsToInputs
  };
})(window);