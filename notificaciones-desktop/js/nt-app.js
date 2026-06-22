/*
  Nombre completo: nt-app.js
  Ruta: notificaciones-desktop/js/nt-app.js
  Función:
    - Inicializar el módulo Notificaciones Desktop.
    - Leer configuración local.
    - Detectar modo Web o modo Electron.
    - Pintar estado inicial.
    - Activar botones reales del Bloque 2.
    - Dejar lista la pantalla para Live Server, doble clic y futura integración Electron.

  Se conecta con:
    - nt-config.js
    - nt-storage.js
    - nt-firebase-config.js
    - nt-firebase.service.js
    - nt-environment.service.js
    - nt-notification-api.js
    - nt-electron-bridge.js
    - nt-tray.service.js
    - nt-reminder.service.js
    - nt-ui.js
    - nt-actions.js
    - nt-index.html
*/

(function initNtApp(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function assertRequiredModules() {
    const requiredModules = [
      "Storage",
      "EnvironmentService",
      "NotificationApi",
      "ElectronBridge",
      "TrayService",
      "ReminderService",
      "UI",
      "Actions"
    ];

    const missingModules = requiredModules.filter((moduleName) => {
      return !NT[moduleName];
    });

    if (missingModules.length > 0) {
      throw new Error(
        `Faltan módulos requeridos: ${missingModules.join(", ")}. Revisa el orden de scripts en nt-index.html.`
      );
    }
  }

  function mergeInitialSettings(localSettings, environment) {
    return NT.Storage.saveSettings({
      ...localSettings,
      environmentMode: environment.environmentMode,
      electronAvailable: environment.electronAvailable,
      webNotificationsSupported: environment.webNotificationsSupported,
      webNotificationsPermission: environment.webNotificationsPermission,
      originMode: environment.originMode,
      updatedAt: Utils.nowIso()
    });
  }

  function showInitialOutput(environment, settings) {
    const modeLabel = environment.environmentMode === CONFIG.ENVIRONMENT_ELECTRON
      ? "Modo Electron"
      : "Modo Web";

    NT.UI.setOutput({
      ok: true,
      message: environment.message,
      mode: modeLabel,
      ready: true,
      currentSettings: settings,
      availableNow: {
        webPermission: true,
        webSimpleNotification: true,
        webEventNotification: true,
        webTaskNotification: true,
        webDefenseNotification: true,
        soundTest: true
      },
      onlyElectron: {
        electronNotification: true,
        windowsToast: true,
        trayIcon: true,
        trayMenu: true,
        minimizeToTray: true,
        backgroundMode: true,
        automaticReminder: true
      },
      firebaseDocument: "conexiones/notificacionesDesktop",
      initializedAt: Utils.nowIso()
    });
  }

  async function init() {
    try {
      assertRequiredModules();

      const environment = NT.EnvironmentService.detectEnvironment();
      const localSettings = NT.Storage.readSettings();
      const mergedSettings = mergeInitialSettings(localSettings, environment);

      NT.UI.renderSettings(mergedSettings);
      NT.UI.renderEnvironment(environment);
      NT.Actions.bindAll();

      NT.UI.setStatus(
        "ok",
        environment.environmentMode === CONFIG.ENVIRONMENT_ELECTRON
          ? "Electron"
          : "Web"
      );

      showInitialOutput(environment, mergedSettings);
    } catch (error) {
      if (NT.UI) {
        NT.UI.showError(error);
      } else {
        console.error("[NT] Error al iniciar Notificaciones Desktop:", error);
      }
    }
  }

  NT.App = {
    init
  };

  document.addEventListener("DOMContentLoaded", init);
})(window);