/*
  Nombre completo: nt-actions.js
  Ruta: notificaciones-desktop/js/nt-actions.js
  Función:
    - Conectar botones de la pantalla con funciones reales.
    - Guardar configuración local y Firebase.
    - Leer configuración desde Firebase.
    - Borrar configuración local y marcar Firebase como desactivado.
    - Ejecutar pruebas web.
    - Ejecutar pruebas Electron mediante puente cuando exista.
    - Evitar que los botones queden solo como placeholder.

  Se conecta con:
    - nt-config.js
    - nt-storage.js
    - nt-firebase.service.js
    - nt-environment.service.js
    - nt-notification-api.js
    - nt-electron-bridge.js
    - nt-tray.service.js
    - nt-reminder.service.js
    - nt-ui.js
    - nt-app.js
*/

(function initNtActions(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function getElement(id) {
    return document.getElementById(id);
  }

  function bindClick(id, handler) {
    const button = getElement(id);

    if (!button) {
      return;
    }

    /*
      Usamos capture + stopImmediatePropagation porque en el Bloque 1
      nt-environment.service.js dejó listeners placeholder. Esto permite
      que esta acción real mande sobre el placeholder sin tener que editar
      todavía el archivo anterior.
    */
    button.addEventListener(
      "click",
      async function handleButtonClick(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        try {
          await handler(event);
        } catch (error) {
          await saveError(error);
          NT.UI.showError(error);
        }
      },
      true
    );
  }

  async function saveError(error, extraData) {
    if (NT.NotificationApi && typeof NT.NotificationApi.saveError === "function") {
      return await NT.NotificationApi.saveError(error, extraData && extraData.testType);
    }

    if (NT.FirebaseService && typeof NT.FirebaseService.saveErrorStatus === "function") {
      try {
        return await NT.FirebaseService.saveErrorStatus(error, extraData || {});
      } catch (firebaseError) {
        return {
          ok: false,
          message: error.message,
          firebaseWarning: firebaseError.message
        };
      }
    }

    return {
      ok: false,
      message: error && error.message ? error.message : String(error)
    };
  }

  function getEnvironmentStatus() {
    if (NT.EnvironmentService && typeof NT.EnvironmentService.detectEnvironment === "function") {
      return NT.EnvironmentService.detectEnvironment();
    }

    return {
      environmentMode: CONFIG.ENVIRONMENT_WEB,
      electronAvailable: false
    };
  }

  async function saveSettings() {
    NT.UI.showLoading("Guardando configuración de notificaciones...");

    const environment = getEnvironmentStatus();
    const formSettings = NT.Storage.createSettingsFromInputs();

    const payload = NT.Storage.saveSettings({
      ...formSettings,
      environmentMode: environment.environmentMode,
      electronAvailable: environment.electronAvailable,
      webNotificationsSupported: environment.webNotificationsSupported,
      webNotificationsPermission: environment.webNotificationsPermission,
      originMode: environment.originMode,
      configured: true,
      lastTestAt: Utils.nowIso(),
      lastTestType: "save-settings",
      lastTestStatus: "ok",
      lastErrorMessage: ""
    });

    let firebaseResult = null;

    if (NT.FirebaseService && typeof NT.FirebaseService.saveNotificationSettings === "function") {
      firebaseResult = await NT.FirebaseService.saveNotificationSettings(payload);
    }

    NT.UI.renderSettings(payload);
    NT.UI.renderEnvironment(environment);

    NT.UI.showSuccess("Configuración guardada correctamente.", {
      localStorage: payload,
      firebase: firebaseResult || "Firebase no disponible."
    });
  }

  async function readFirebaseSettings() {
    NT.UI.showLoading("Leyendo configuración desde Firebase...");

    if (!NT.FirebaseService || typeof NT.FirebaseService.readNotificationSettings !== "function") {
      throw new Error("No está cargado nt-firebase.service.js.");
    }

    const firebaseData = await NT.FirebaseService.readNotificationSettings();

    if (!firebaseData) {
      NT.UI.showSuccess("No existe configuración guardada todavía en Firebase.", {
        document: "conexiones/notificacionesDesktop"
      });
      return;
    }

    const normalized = NT.Storage.saveSettings(firebaseData);

    NT.UI.renderSettings(normalized);
    NT.UI.refreshEnvironment();

    NT.UI.showSuccess("Configuración leída desde Firebase.", {
      firebase: firebaseData,
      localStorage: normalized
    });
  }

  async function clearSettings() {
    NT.UI.showLoading("Borrando configuración local y marcando Firebase como desactivado...");

    const localResult = NT.Storage.clearSettings();
    NT.UI.renderSettings(localResult);

    let firebaseResult = null;

    if (NT.FirebaseService && typeof NT.FirebaseService.markNotificationsDisconnected === "function") {
      firebaseResult = await NT.FirebaseService.markNotificationsDisconnected();
    }

    NT.UI.refreshEnvironment();

    NT.UI.showSuccess("Datos borrados correctamente.", {
      localStorage: localResult,
      firebase: firebaseResult || "Firebase no disponible."
    });
  }

  async function requestPermission() {
    NT.UI.showLoading("Solicitando permiso de notificaciones web...");

    const result = await NT.NotificationApi.requestPermission();

    NT.UI.refreshEnvironment();
    NT.UI.setStatus(result.ok ? "ok" : "error", result.ok ? "Permiso OK" : "Sin permiso");
    NT.UI.setOutput(result);
  }

  async function testWebSimple() {
    NT.UI.showLoading("Probando notificación web simple...");

    const result = await NT.NotificationApi.testWebSimple();

    NT.UI.setStatus("ok", "Web OK");
    NT.UI.setOutput(result);
  }

  async function testWebEvent() {
    NT.UI.showLoading("Probando notificación web de evento...");

    const result = await NT.NotificationApi.testWebEvent();

    NT.UI.setStatus("ok", "Evento OK");
    NT.UI.setOutput(result);
  }

  async function testWebTask() {
    NT.UI.showLoading("Probando notificación web de pendiente urgente...");

    const result = await NT.NotificationApi.testWebTask();

    NT.UI.setStatus("ok", "Pendiente OK");
    NT.UI.setOutput(result);
  }

  async function testWebDefense() {
    NT.UI.showLoading("Probando notificación web de defensa...");

    const result = await NT.NotificationApi.testWebDefense();

    NT.UI.setStatus("ok", "Defensa OK");
    NT.UI.setOutput(result);
  }

  async function testSound() {
    NT.UI.showLoading("Probando sonido local...");

    const result = await NT.NotificationApi.testSound();

    NT.UI.setStatus("ok", "Sonido OK");
    NT.UI.setOutput(result);
  }

  async function testElectronNotification() {
    NT.UI.showLoading("Probando notificación Electron...");

    const result = await NT.ElectronBridge.testElectronNotification();

    NT.UI.showElectronOnly(CONFIG.TEST_ELECTRON_NOTIFICATION, result);
  }

  async function testWindowsToast() {
    NT.UI.showLoading("Probando notificación Windows...");

    const result = await NT.ElectronBridge.testWindowsToast();

    NT.UI.showElectronOnly(CONFIG.TEST_WINDOWS_TOAST, result);
  }

  async function testTrayIcon() {
    NT.UI.showLoading("Probando icono junto al reloj...");

    const result = await NT.TrayService.testTrayIcon();

    NT.UI.showElectronOnly(CONFIG.TEST_TRAY_ICON, result);
  }

  async function testTrayMenu() {
    NT.UI.showLoading("Probando menú de bandeja...");

    const result = await NT.TrayService.testTrayMenu();

    NT.UI.showElectronOnly(CONFIG.TEST_TRAY_MENU, result);
  }

  async function testMinimizeToTray() {
    NT.UI.showLoading("Probando minimizar a bandeja...");

    const result = await NT.TrayService.testMinimizeToTray();

    NT.UI.showElectronOnly(CONFIG.TEST_MINIMIZE_TO_TRAY, result);
  }

  async function testBackgroundMode() {
    NT.UI.showLoading("Probando segundo plano...");

    const result = await NT.TrayService.testBackgroundMode();

    NT.UI.showElectronOnly(CONFIG.TEST_BACKGROUND, result);
  }

  async function testAutomaticReminder() {
    NT.UI.showLoading("Probando recordatorio automático...");

    const result = await NT.ReminderService.testAutomaticReminder();

    NT.UI.showElectronOnly(CONFIG.TEST_REMINDER, result);
  }

  function bindAll() {
    bindClick("ntSaveSettingsBtn", saveSettings);
    bindClick("ntLoadFirebaseBtn", readFirebaseSettings);
    bindClick("ntClearSettingsBtn", clearSettings);

    bindClick("ntRequestPermissionBtn", requestPermission);
    bindClick("ntTestWebSimpleBtn", testWebSimple);
    bindClick("ntTestWebEventBtn", testWebEvent);
    bindClick("ntTestWebTaskBtn", testWebTask);
    bindClick("ntTestWebDefenseBtn", testWebDefense);
    bindClick("ntTestSoundBtn", testSound);

    bindClick("ntTestElectronNotificationBtn", testElectronNotification);
    bindClick("ntTestWindowsToastBtn", testWindowsToast);
    bindClick("ntTestTrayIconBtn", testTrayIcon);
    bindClick("ntTestTrayMenuBtn", testTrayMenu);
    bindClick("ntTestMinimizeTrayBtn", testMinimizeToTray);
    bindClick("ntTestBackgroundBtn", testBackgroundMode);
    bindClick("ntTestReminderBtn", testAutomaticReminder);
  }

  NT.Actions = {
    bindAll,
    saveSettings,
    readFirebaseSettings,
    clearSettings,
    requestPermission,
    testWebSimple,
    testWebEvent,
    testWebTask,
    testWebDefense,
    testSound,
    testElectronNotification,
    testWindowsToast,
    testTrayIcon,
    testTrayMenu,
    testMinimizeToTray,
    testBackgroundMode,
    testAutomaticReminder
  };
})(window);