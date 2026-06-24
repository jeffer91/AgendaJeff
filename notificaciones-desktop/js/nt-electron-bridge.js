/*
  Nombre completo: nt-electron-bridge.js
  Ruta: notificaciones-desktop/js/nt-electron-bridge.js

  Función:
    - Detectar si existe un puente Electron disponible.
    - Buscar el puente en la ventana actual, parent y top para soportar iframes.
    - En modo Web responder claramente que las funciones reales requieren Electron.
    - En modo Electron ejecutar pruebas reales de notificación, Tray y segundo plano.
*/

(function initNtElectronBridge(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  const ACTION_METHODS = {
    "electron-notification": "showNotification",
    "windows-toast": "showWindowsToast",
    "tray-icon": "createTrayIcon",
    "tray-menu": "testTrayMenu",
    "minimize-to-tray": "minimizeToTray",
    "background": "testBackground",
    "reminder": "testReminder"
  };

  function nowIso() {
    return Utils && typeof Utils.nowIso === "function"
      ? Utils.nowIso()
      : new Date().toISOString();
  }

  function cleanString(value) {
    return Utils && typeof Utils.cleanString === "function"
      ? Utils.cleanString(value)
      : String(value ?? "").trim();
  }

  function isPlainObject(value) {
    return Utils && typeof Utils.isPlainObject === "function"
      ? Utils.isPlainObject(value)
      : Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function getWindowCandidates() {
    const candidates = [global];

    try {
      if (global.parent && global.parent !== global) {
        candidates.push(global.parent);
      }
    } catch (_error) {
      // Ignorar acceso cruzado.
    }

    try {
      if (global.top && global.top !== global && global.top !== global.parent) {
        candidates.push(global.top);
      }
    } catch (_error) {
      // Ignorar acceso cruzado.
    }

    return candidates;
  }

  function getBridgeObject() {
    const bridgeNames = Array.isArray(CONFIG.ELECTRON_BRIDGE_NAMES)
      ? CONFIG.ELECTRON_BRIDGE_NAMES
      : ["agendaJeffNotifications", "AgendaJeffElectron", "agendaJeff", "electronAPI", "api"];

    for (const candidateWindow of getWindowCandidates()) {
      for (const name of bridgeNames) {
        try {
          if (candidateWindow[name] && typeof candidateWindow[name] === "object") {
            return {
              name,
              bridge: candidateWindow[name]
            };
          }
        } catch (_error) {
          // Siguiente candidato.
        }
      }
    }

    return {
      name: "",
      bridge: null
    };
  }

  function getEnvironment() {
    const bridgeInfo = getBridgeObject();
    const electronAvailable = Boolean(bridgeInfo.bridge);

    return {
      environmentMode: electronAvailable
        ? CONFIG.ENVIRONMENT_ELECTRON
        : CONFIG.ENVIRONMENT_WEB,
      electronAvailable,
      bridgeName: bridgeInfo.name,
      mode: electronAvailable ? "electron" : "web"
    };
  }

  function getBridgeInfo() {
    const environment = getEnvironment();

    return {
      ok: true,
      available: environment.electronAvailable,
      name: environment.bridgeName,
      methods: environment.electronAvailable
        ? Object.keys(getBridgeObject().bridge || {})
        : [],
      ...environment,
      message: environment.electronAvailable
        ? `Puente Electron disponible: ${environment.bridgeName}.`
        : "Puente Electron no disponible. Ejecuta la app con npm start o electron .",
      checkedAt: nowIso()
    };
  }

  function buildPayload(testType, payload) {
    const safePayload = isPlainObject(payload) ? payload : {};
    const type = cleanString(testType);

    return {
      ...safePayload,
      testType: type,
      source: CONFIG.DEFAULT_SOURCE || "notificaciones-desktop-html-local",
      requestedAt: safePayload.requestedAt || nowIso()
    };
  }

  function resolveMethod(bridge, testType) {
    const methodName = ACTION_METHODS[testType];

    if (methodName && typeof bridge[methodName] === "function") {
      return {
        methodName,
        method: bridge[methodName].bind(bridge)
      };
    }

    if (bridge.notifications && testType === CONFIG.TEST_ELECTRON_NOTIFICATION && typeof bridge.notifications.show === "function") {
      return { methodName: "notifications.show", method: bridge.notifications.show.bind(bridge.notifications) };
    }

    if (bridge.notifications && testType === CONFIG.TEST_WINDOWS_TOAST && typeof bridge.notifications.show === "function") {
      return { methodName: "notifications.show", method: bridge.notifications.show.bind(bridge.notifications) };
    }

    if (bridge.tray && testType === CONFIG.TEST_TRAY_ICON && typeof bridge.tray.testIcon === "function") {
      return { methodName: "tray.testIcon", method: bridge.tray.testIcon.bind(bridge.tray) };
    }

    if (bridge.tray && testType === CONFIG.TEST_TRAY_MENU && typeof bridge.tray.testMenu === "function") {
      return { methodName: "tray.testMenu", method: bridge.tray.testMenu.bind(bridge.tray) };
    }

    if (bridge.tray && testType === CONFIG.TEST_MINIMIZE_TO_TRAY && typeof bridge.tray.minimizeToTray === "function") {
      return { methodName: "tray.minimizeToTray", method: bridge.tray.minimizeToTray.bind(bridge.tray) };
    }

    if (bridge.background && testType === CONFIG.TEST_BACKGROUND && typeof bridge.background.test === "function") {
      return { methodName: "background.test", method: bridge.background.test.bind(bridge.background) };
    }

    if (bridge.notifications && testType === CONFIG.TEST_REMINDER && typeof bridge.notifications.testReminder === "function") {
      return { methodName: "notifications.testReminder", method: bridge.notifications.testReminder.bind(bridge.notifications) };
    }

    return {
      methodName: "",
      method: null
    };
  }

  async function saveBridgeResult(testType, status, result) {
    const payload = {
      ...(isPlainObject(result) ? result : {}),
      environmentMode: result && result.mode ? result.mode : getEnvironment().environmentMode,
      electronAvailable: getEnvironment().electronAvailable,
      lastTestAt: nowIso(),
      lastTestType: cleanString(testType),
      lastTestStatus: cleanString(status || "ok"),
      lastErrorMessage: status === "error" ? cleanString(result && result.message) : ""
    };

    if (NT.Storage && typeof NT.Storage.updateSettings === "function") {
      NT.Storage.updateSettings(payload);
    }

    if (NT.FirebaseService && typeof NT.FirebaseService.saveLastTestStatus === "function") {
      try {
        await NT.FirebaseService.saveLastTestStatus(testType, status, payload);
      } catch (error) {
        payload.firebaseWarning = error.message;
      }
    }

    return payload;
  }

  async function syncSettingsWithElectron(settings) {
    const bridgeInfo = getBridgeObject();

    if (!bridgeInfo.bridge) {
      return {
        ok: false,
        mode: "web",
        message: "No se puede sincronizar con Electron porque la app está en modo Web."
      };
    }

    if (typeof bridgeInfo.bridge.syncSettings === "function") {
      return bridgeInfo.bridge.syncSettings(settings || {});
    }

    if (bridgeInfo.bridge.background && typeof bridgeInfo.bridge.background.syncSettings === "function") {
      return bridgeInfo.bridge.background.syncSettings(settings || {});
    }

    return {
      ok: false,
      mode: "electron",
      message: "El puente Electron no tiene función para sincronizar configuración."
    };
  }

  async function runElectronTest(testType, payload) {
    const environment = getEnvironment();
    const builtPayload = buildPayload(testType, payload);

    if (!environment.electronAvailable) {
      const webResult = {
        ok: false,
        mode: CONFIG.ENVIRONMENT_WEB,
        message: "Esta prueba solo funciona en la app de escritorio con Electron.",
        testType,
        payload: builtPayload,
        help: "Abre AgendaJeff con npm start para probar segundo plano, Tray y notificaciones nativas."
      };

      return saveBridgeResult(testType, "error", webResult);
    }

    const bridgeInfo = getBridgeObject();
    const resolved = resolveMethod(bridgeInfo.bridge, testType);

    if (!resolved.method) {
      const missingResult = {
        ok: false,
        mode: CONFIG.ENVIRONMENT_ELECTRON,
        message: `El puente Electron existe, pero no tiene método para la prueba: ${testType}.`,
        bridgeName: bridgeInfo.name,
        testType,
        payload: builtPayload
      };

      return saveBridgeResult(testType, "error", missingResult);
    }

    try {
      const result = await resolved.method(builtPayload);
      const normalizedResult = {
        ...(isPlainObject(result) ? result : { result }),
        ok: result && typeof result.ok === "boolean" ? result.ok : true,
        mode: CONFIG.ENVIRONMENT_ELECTRON,
        bridgeName: bridgeInfo.name,
        methodName: resolved.methodName,
        testType,
        payload: builtPayload,
        executedAt: nowIso()
      };

      return saveBridgeResult(testType, normalizedResult.ok ? "ok" : "error", normalizedResult);
    } catch (error) {
      const errorResult = {
        ok: false,
        mode: CONFIG.ENVIRONMENT_ELECTRON,
        bridgeName: bridgeInfo.name,
        methodName: resolved.methodName,
        testType,
        message: error.message,
        payload: builtPayload,
        executedAt: nowIso()
      };

      return saveBridgeResult(testType, "error", errorResult);
    }
  }

  async function testElectronNotification() {
    return runElectronTest(CONFIG.TEST_ELECTRON_NOTIFICATION, {
      title: "AgendaJeff - Electron",
      body: "Prueba de notificación nativa desde Electron."
    });
  }

  async function testWindowsToast() {
    return runElectronTest(CONFIG.TEST_WINDOWS_TOAST, {
      title: "AgendaJeff - Windows",
      body: "Prueba de notificación tipo toast de Windows."
    });
  }

  NT.ElectronBridge = {
    ACTION_METHODS,
    getBridgeInfo,
    getBridgeObject,
    getEnvironment,
    buildPayload,
    resolveMethod,
    syncSettingsWithElectron,
    runElectronTest,
    testElectronNotification,
    testWindowsToast
  };
})(window);
