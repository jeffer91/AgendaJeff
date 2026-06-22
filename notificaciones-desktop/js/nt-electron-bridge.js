/*
  Nombre completo: nt-electron-bridge.js
  Ruta: notificaciones-desktop/js/nt-electron-bridge.js
  Función:
    - Detectar si existe un puente Electron disponible.
    - En modo Web responder: "Esto solo funcionará en modo Electron".
    - En modo Electron enviar pruebas al puente real cuando exista.
    - Dejar preparados los nombres de acciones para:
      notificación Electron, Windows toast, icono junto al reloj, menú de bandeja,
      minimizar a bandeja, segundo plano y recordatorio automático.

  Se conecta con:
    - nt-config.js
    - nt-environment.service.js
    - nt-storage.js
    - nt-firebase.service.js
    - nt-tray.service.js
    - nt-reminder.service.js
    - nt-actions.js

  Puente Electron futuro sugerido:
    - window.agendaJeffNotifications.showNotification(payload)
    - window.agendaJeffNotifications.showWindowsToast(payload)
    - window.agendaJeffNotifications.createTrayIcon(payload)
    - window.agendaJeffNotifications.testTrayMenu(payload)
    - window.agendaJeffNotifications.minimizeToTray(payload)
    - window.agendaJeffNotifications.testBackground(payload)
    - window.agendaJeffNotifications.testReminder(payload)
*/

(function initNtElectronBridge(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  const ACTION_METHODS = {
    [CONFIG.TEST_ELECTRON_NOTIFICATION]: [
      "showNotification",
      "testNotification",
      "showElectronNotification"
    ],

    [CONFIG.TEST_WINDOWS_TOAST]: [
      "showWindowsToast",
      "testWindowsToast",
      "showToast"
    ],

    [CONFIG.TEST_TRAY_ICON]: [
      "createTrayIcon",
      "testTrayIcon",
      "showTrayIcon"
    ],

    [CONFIG.TEST_TRAY_MENU]: [
      "testTrayMenu",
      "showTrayMenu",
      "createTrayMenu"
    ],

    [CONFIG.TEST_MINIMIZE_TO_TRAY]: [
      "minimizeToTray",
      "testMinimizeToTray"
    ],

    [CONFIG.TEST_BACKGROUND]: [
      "testBackground",
      "keepAlive",
      "testBackgroundMode"
    ],

    [CONFIG.TEST_REMINDER]: [
      "testReminder",
      "showReminder",
      "testAutomaticReminder"
    ]
  };

  function getBridgeInfo() {
    if (NT.EnvironmentService && typeof NT.EnvironmentService.findElectronBridge === "function") {
      return NT.EnvironmentService.findElectronBridge();
    }

    for (const bridgeName of CONFIG.ELECTRON_BRIDGE_NAMES) {
      const bridge = global[bridgeName];

      if (bridge && typeof bridge === "object") {
        return {
          available: true,
          name: bridgeName,
          methods: Object.keys(bridge).filter((key) => {
            return typeof bridge[key] === "function";
          })
        };
      }
    }

    return {
      available: false,
      name: "",
      methods: []
    };
  }

  function getBridgeObject() {
    const info = getBridgeInfo();

    if (!info.available || !info.name) {
      return null;
    }

    return global[info.name] || null;
  }

  function getEnvironment() {
    if (NT.EnvironmentService && typeof NT.EnvironmentService.detectEnvironment === "function") {
      return NT.EnvironmentService.detectEnvironment();
    }

    return {
      environmentMode: CONFIG.ENVIRONMENT_WEB,
      electronAvailable: false
    };
  }

  function createWebOnlyError(testType) {
    return {
      ok: false,
      mode: CONFIG.ENVIRONMENT_WEB,
      testType,
      message: "Esto solo funcionará en modo Electron. Ahora estás en modo Web.",
      createdAt: Utils.nowIso()
    };
  }

  function createBridgeMissingError(testType) {
    return {
      ok: false,
      mode: CONFIG.ENVIRONMENT_ELECTRON,
      testType,
      message: "Estás en modo Electron, pero todavía no existe el puente de notificaciones para ejecutar esta prueba.",
      expectedBridge: "window.agendaJeffNotifications",
      createdAt: Utils.nowIso()
    };
  }

  function createMethodMissingError(testType, bridgeInfo) {
    return {
      ok: false,
      mode: CONFIG.ENVIRONMENT_ELECTRON,
      testType,
      message: "El puente Electron existe, pero todavía no tiene el método necesario para esta prueba.",
      bridgeName: bridgeInfo.name,
      availableMethods: bridgeInfo.methods,
      expectedMethods: ACTION_METHODS[testType] || [],
      createdAt: Utils.nowIso()
    };
  }

  function buildPayload(testType, customPayload) {
    const environment = getEnvironment();

    return {
      appName: CONFIG.APP_NAME,
      moduleName: CONFIG.MODULE_NAME,
      testType,
      environmentMode: environment.environmentMode,
      electronAvailable: environment.electronAvailable,
      title: "AgendaJeff",
      body: "Prueba desde el módulo Notificaciones Desktop.",
      createdAt: Utils.nowIso(),
      ...(Utils.isPlainObject(customPayload) ? customPayload : {})
    };
  }

  async function callMethod(bridge, methodName, payload) {
    const result = bridge[methodName](payload);

    if (result && typeof result.then === "function") {
      return await result;
    }

    return result;
  }

  async function runElectronTest(testType, customPayload) {
    const environment = getEnvironment();

    if (environment.environmentMode !== CONFIG.ENVIRONMENT_ELECTRON) {
      const webError = createWebOnlyError(testType);
      await saveBridgeResult(testType, "error", webError);
      return webError;
    }

    const bridgeInfo = getBridgeInfo();
    const bridge = getBridgeObject();

    if (!bridgeInfo.available || !bridge) {
      const missingBridge = createBridgeMissingError(testType);
      await saveBridgeResult(testType, "error", missingBridge);
      return missingBridge;
    }

    const payload = buildPayload(testType, customPayload);
    const preferredMethods = ACTION_METHODS[testType] || [];
    const methodName = preferredMethods.find((method) => {
      return typeof bridge[method] === "function";
    });

    if (!methodName) {
      const missingMethod = createMethodMissingError(testType, bridgeInfo);
      await saveBridgeResult(testType, "error", missingMethod);
      return missingMethod;
    }

    try {
      const bridgeResponse = await callMethod(bridge, methodName, payload);

      const result = {
        ok: true,
        mode: CONFIG.ENVIRONMENT_ELECTRON,
        testType,
        bridgeName: bridgeInfo.name,
        methodName,
        payload,
        bridgeResponse: bridgeResponse || null,
        message: "Prueba Electron enviada correctamente al puente.",
        createdAt: Utils.nowIso()
      };

      await saveBridgeResult(testType, "ok", result);

      return result;
    } catch (error) {
      const result = {
        ok: false,
        mode: CONFIG.ENVIRONMENT_ELECTRON,
        testType,
        bridgeName: bridgeInfo.name,
        methodName,
        message: error.message,
        createdAt: Utils.nowIso()
      };

      await saveBridgeResult(testType, "error", result);

      return result;
    }
  }

  async function saveBridgeResult(testType, status, result) {
    const payload = {
      ...(Utils.isPlainObject(result) ? result : {}),
      environmentMode: result && result.mode
        ? result.mode
        : getEnvironment().environmentMode,
      electronAvailable: getEnvironment().electronAvailable,
      lastTestAt: Utils.nowIso(),
      lastTestType: Utils.cleanString(testType),
      lastTestStatus: Utils.cleanString(status || "ok"),
      lastErrorMessage: status === "error"
        ? Utils.cleanString(result && result.message)
        : ""
    };

    if (NT.Storage) {
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
    runElectronTest,
    testElectronNotification,
    testWindowsToast
  };
})(window);