/*
  Nombre completo: nt-tray.service.js
  Ruta: notificaciones-desktop/js/nt-tray.service.js
  Función:
    - Preparar pruebas del icono junto al reloj.
    - Preparar prueba del menú de bandeja.
    - Preparar prueba de minimizar a bandeja.
    - Preparar prueba de mantener la app viva en segundo plano.
    - En modo Web responde que solo funcionará en Electron.
    - En modo Electron usa nt-electron-bridge.js.

  Se conecta con:
    - nt-config.js
    - nt-electron-bridge.js
    - nt-actions.js
    - nt-ui.js

  Importante:
    - Este archivo no crea el Tray directamente en navegador.
    - El Tray real se creará después desde Electron.
*/

(function initNtTrayService(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function assertElectronBridgeService() {
    if (!NT.ElectronBridge || typeof NT.ElectronBridge.runElectronTest !== "function") {
      throw new Error("No está cargado nt-electron-bridge.js.");
    }
  }

  async function testTrayIcon() {
    assertElectronBridgeService();

    return await NT.ElectronBridge.runElectronTest(CONFIG.TEST_TRAY_ICON, {
      title: "AgendaJeff - Icono junto al reloj",
      body: "Prueba para crear o validar el icono de AgendaJeff junto al reloj.",
      trayTooltip: "AgendaJeff activo",
      requestedAt: Utils.nowIso()
    });
  }

  async function testTrayMenu() {
    assertElectronBridgeService();

    return await NT.ElectronBridge.runElectronTest(CONFIG.TEST_TRAY_MENU, {
      title: "AgendaJeff - Menú de bandeja",
      body: "Prueba para mostrar opciones del menú de bandeja.",
      menuItems: [
        "Abrir AgendaJeff",
        "Ver eventos de hoy",
        "Probar notificación",
        "Silenciar 1 hora",
        "Salir"
      ],
      requestedAt: Utils.nowIso()
    });
  }

  async function testMinimizeToTray() {
    assertElectronBridgeService();

    return await NT.ElectronBridge.runElectronTest(CONFIG.TEST_MINIMIZE_TO_TRAY, {
      title: "AgendaJeff - Minimizar a bandeja",
      body: "Prueba para cerrar la ventana y dejar AgendaJeff activo junto al reloj.",
      requestedAt: Utils.nowIso()
    });
  }

  async function testBackgroundMode() {
    assertElectronBridgeService();

    return await NT.ElectronBridge.runElectronTest(CONFIG.TEST_BACKGROUND, {
      title: "AgendaJeff - Segundo plano",
      body: "Prueba para mantener AgendaJeff activo revisando recordatorios.",
      requestedAt: Utils.nowIso()
    });
  }

  NT.TrayService = {
    testTrayIcon,
    testTrayMenu,
    testMinimizeToTray,
    testBackgroundMode
  };
})(window);