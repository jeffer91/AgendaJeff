/*
  Nombre completo: nt-environment.service.js
  Ruta: notificaciones-desktop/js/nt-environment.service.js
  Función:
    - Detectar si la pantalla está corriendo en modo Web.
    - Detectar si la pantalla está corriendo en modo Electron.
    - Detectar si existe un puente Electron disponible.
    - Mostrar en pantalla qué funciones pueden probarse ahora.
    - En modo Web, responder claramente cuando un botón solo funcione en Electron.
    - En modo Electron futuro, dejar preparado el flujo para ejecutar pruebas reales.

  Se conecta con:
    - nt-config.js
    - nt-storage.js
    - nt-firebase.service.js
    - nt-index.html

  Importante:
    - Este archivo no crea notificaciones todavía.
    - Las notificaciones reales se crearán en el Bloque 2.
    - El objetivo de este archivo es detectar ambiente y preparar la pantalla.
*/

(function initNtEnvironmentService(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = getElement(id);

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  function setClassName(element, className) {
    if (element) {
      element.className = className;
    }
  }

  function setOutput(payload) {
    const output = getElement("ntOutput");

    if (!output) {
      return;
    }

    if (typeof payload === "string") {
      output.textContent = payload;
      return;
    }

    output.textContent = JSON.stringify(payload, null, 2);
  }

  function setStatus(type, text) {
    const badge = getElement("ntStatusBadge");

    if (!badge) {
      return;
    }

    const safeType = Utils.cleanString(type || "idle");

    const classMap = {
      idle: "nt-status nt-status--idle",
      ok: "nt-status nt-status--ok",
      error: "nt-status nt-status--error",
      loading: "nt-status nt-status--loading"
    };

    badge.className = classMap[safeType] || classMap.idle;
    badge.textContent = Utils.cleanString(text || "Sin probar");
  }

  function detectOriginMode() {
    const protocol = global.location && global.location.protocol
      ? global.location.protocol
      : "";

    const hostname = global.location && global.location.hostname
      ? global.location.hostname
      : "";

    if (protocol === "file:") {
      return CONFIG.ORIGIN_FILE;
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return CONFIG.ORIGIN_LOCALHOST;
    }

    if (protocol === "http:" || protocol === "https:") {
      return CONFIG.ORIGIN_REMOTE;
    }

    return CONFIG.ORIGIN_UNKNOWN;
  }

  function detectWebNotificationSupport() {
    return typeof global.Notification === "function";
  }

  function detectWebNotificationPermission() {
    if (!detectWebNotificationSupport()) {
      return "unsupported";
    }

    return Utils.normalizePermission(global.Notification.permission);
  }

  function findElectronBridge() {
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

  function detectElectronRuntime() {
    const processVersions = global.process && global.process.versions
      ? global.process.versions
      : null;

    if (processVersions && processVersions.electron) {
      return true;
    }

    const userAgent = global.navigator && global.navigator.userAgent
      ? global.navigator.userAgent.toLowerCase()
      : "";

    if (userAgent.includes(" electron/")) {
      return true;
    }

    const bridge = findElectronBridge();

    return bridge.available;
  }

  function detectEnvironment() {
    const bridge = findElectronBridge();
    const electronRuntime = detectElectronRuntime();
    const electronAvailable = Boolean(electronRuntime || bridge.available);
    const environmentMode = electronAvailable
      ? CONFIG.ENVIRONMENT_ELECTRON
      : CONFIG.ENVIRONMENT_WEB;

    const originMode = detectOriginMode();
    const webNotificationsSupported = detectWebNotificationSupport();
    const webNotificationsPermission = detectWebNotificationPermission();

    const status = {
      appName: CONFIG.APP_NAME,
      moduleName: CONFIG.MODULE_NAME,
      environmentMode,
      electronAvailable,
      electronRuntime,
      electronBridgeAvailable: bridge.available,
      electronBridgeName: bridge.name,
      electronBridgeMethods: bridge.methods,
      originMode,
      pageUrl: global.location ? global.location.href : "",
      isSecureContext: Boolean(global.isSecureContext),
      webNotificationsSupported,
      webNotificationsPermission,
      detectedAt: Utils.nowIso()
    };

    status.message = createEnvironmentMessage(status);

    return status;
  }

  function createEnvironmentMessage(status) {
    if (status.environmentMode === CONFIG.ENVIRONMENT_ELECTRON) {
      return "Ya estás en modo Electron. Las pruebas de Electron podrán ejecutarse cuando el puente esté conectado.";
    }

    return "Estás en modo Web. Las pruebas web funcionarán aquí. Las pruebas de icono junto al reloj, bandeja, segundo plano y Windows real solo funcionarán en modo Electron.";
  }

  function renderEnvironment(status) {
    const safeStatus = status || detectEnvironment();

    const environmentBadge = getElement("ntEnvironmentBadge");
    const electronBadge = getElement("ntElectronBadge");

    const isElectron = safeStatus.environmentMode === CONFIG.ENVIRONMENT_ELECTRON;

    setText(
      "ntModeText",
      isElectron ? "Modo Electron" : "Modo Web"
    );

    setText(
      "ntElectronText",
      safeStatus.electronAvailable ? "Sí" : "No"
    );

    setText(
      "ntOriginText",
      safeStatus.originMode || "unknown"
    );

    setText(
      "ntPermissionText",
      safeStatus.webNotificationsPermission || "unknown"
    );

    setText("ntModeDescription", safeStatus.message);

    if (environmentBadge) {
      environmentBadge.textContent = isElectron ? "Modo Electron" : "Modo Web";
      environmentBadge.className = isElectron
        ? "nt-pill nt-pill--electron"
        : "nt-pill nt-pill--web";
    }

    if (electronBadge) {
      electronBadge.textContent = safeStatus.electronAvailable
        ? "Electron disponible"
        : "Solo Electron";
      electronBadge.className = safeStatus.electronAvailable
        ? "nt-pill nt-pill--ok"
        : "nt-pill nt-pill--electron";
    }

    setStatus("ok", isElectron ? "Electron" : "Web");

    return safeStatus;
  }

  function saveEnvironmentLocally(status) {
    if (!NT.Storage) {
      return status;
    }

    const currentSettings = NT.Storage.readSettings();

    const nextSettings = NT.Storage.saveSettings({
      ...currentSettings,
      environmentMode: status.environmentMode,
      electronAvailable: status.electronAvailable,
      webNotificationsSupported: status.webNotificationsSupported,
      webNotificationsPermission: status.webNotificationsPermission,
      originMode: status.originMode
    });

    NT.Storage.writeSettingsToInputs(nextSettings);

    return nextSettings;
  }

  async function saveEnvironmentInFirebase(status) {
    if (!NT.FirebaseService || typeof NT.FirebaseService.saveEnvironmentStatus !== "function") {
      return null;
    }

    try {
      return await NT.FirebaseService.saveEnvironmentStatus(status);
    } catch (error) {
      return {
        ok: false,
        message: error.message
      };
    }
  }

  async function runEnvironmentDetection() {
    setStatus("loading", "Detectando");

    const status = detectEnvironment();
    renderEnvironment(status);
    const localSettings = saveEnvironmentLocally(status);
    const firebaseResult = await saveEnvironmentInFirebase(status);

    const output = {
      ok: true,
      message: status.message,
      environment: status,
      localStorage: localSettings,
      firebase: firebaseResult || "Firebase no disponible o no inicializado todavía."
    };

    setOutput(output);
    setStatus("ok", status.environmentMode === CONFIG.ENVIRONMENT_ELECTRON ? "Electron" : "Web");

    return output;
  }

  function createElectronOnlyMessage(testName) {
    const status = detectEnvironment();

    if (status.environmentMode === CONFIG.ENVIRONMENT_ELECTRON) {
      return {
        ok: true,
        mode: "electron",
        testName,
        message: "Ya estás en modo Electron. Esta prueba se conectará al puente real en el Bloque 2."
      };
    }

    return {
      ok: false,
      mode: "web",
      testName,
      message: "Esto solo funcionará en modo Electron. Ahora estás en modo Web."
    };
  }

  function bindElectronOnlyButtons() {
    const buttons = document.querySelectorAll("[data-nt-electron-only]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const testName = button.getAttribute("data-nt-electron-only");
        const result = createElectronOnlyMessage(testName);

        setStatus(result.ok ? "ok" : "error", result.ok ? "Electron" : "Solo Electron");
        setOutput(result);
      });
    });
  }

  function bindPlaceholderButtons() {
    const buttons = document.querySelectorAll("[data-nt-placeholder-message]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const message = button.getAttribute("data-nt-placeholder-message");

        setStatus("idle", "Bloque 2");

        setOutput({
          ok: false,
          message,
          note: "Este botón ya está creado visualmente. Su función real se activa en el siguiente bloque de archivos."
        });
      });
    });
  }

  function bindDetectButton() {
    const button = getElement("ntDetectEnvironmentBtn");

    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      runEnvironmentDetection();
    });
  }

  function init() {
    const status = detectEnvironment();

    renderEnvironment(status);
    saveEnvironmentLocally(status);

    setOutput({
      ok: true,
      message: status.message,
      environment: status,
      nextStep: "Crear el Bloque 2 para activar botones reales de notificaciones, Electron, bandeja y recordatorios."
    });

    bindDetectButton();
    bindElectronOnlyButtons();
    bindPlaceholderButtons();
  }

  NT.EnvironmentService = {
    detectOriginMode,
    detectWebNotificationSupport,
    detectWebNotificationPermission,
    findElectronBridge,
    detectElectronRuntime,
    detectEnvironment,
    renderEnvironment,
    runEnvironmentDetection,
    createElectronOnlyMessage,
    setOutput,
    setStatus,
    init
  };

  document.addEventListener("DOMContentLoaded", init);
})(window);