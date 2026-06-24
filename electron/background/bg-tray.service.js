/*
  Nombre completo: bg-tray.service.js
  Ruta: electron/background/bg-tray.service.js

  Función:
    - Crear el ícono real junto al reloj.
    - Permitir abrir, ocultar, probar notificación y salir completamente.
    - Mantener la app viva cuando la ventana se oculta.
*/

"use strict";

const { Tray, Menu, nativeImage } = require("electron");

function createBackgroundTrayService(app, config, dependencies) {
  const CONFIG = config || {};
  const deps = dependencies || {};

  let tray = null;
  let hasShownFirstHideBalloon = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function createTrayImage() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="16" fill="#2563eb"/>
        <text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#ffffff">AJ</text>
      </svg>`;

    try {
      const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      if (!image.isEmpty()) {
        return image.resize({ width: 16, height: 16 });
      }
    } catch (_error) {
      // Fallback abajo.
    }

    return nativeImage.createEmpty();
  }

  function getMainWindow() {
    return typeof deps.getMainWindow === "function" ? deps.getMainWindow() : null;
  }

  function showMainWindow() {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      if (typeof deps.createMainWindow === "function") {
        deps.createMainWindow();
        return { ok: true, message: "Ventana principal recreada.", shownAt: nowIso() };
      }

      return { ok: false, message: "La ventana principal no está disponible." };
    }

    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    refreshMenu();

    return { ok: true, message: "AgendaJeff visible.", shownAt: nowIso() };
  }

  function showTrayBalloon(payload) {
    if (!tray || typeof tray.displayBalloon !== "function") {
      return { ok: false, message: "El Tray todavía no está disponible." };
    }

    try {
      tray.displayBalloon({
        title: String(payload && payload.title ? payload.title : "AgendaJeff"),
        content: String(payload && (payload.content || payload.body) ? (payload.content || payload.body) : "AgendaJeff está activo."),
        noSound: false
      });
      return { ok: true, message: "Mensaje de bandeja mostrado.", shownAt: nowIso() };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  function hideMainWindow() {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, message: "La ventana principal no está disponible." };
    }

    mainWindow.hide();
    refreshMenu();

    if (CONFIG.background && CONFIG.background.showTrayBalloonOnFirstHide && !hasShownFirstHideBalloon) {
      hasShownFirstHideBalloon = true;
      showTrayBalloon({
        title: "AgendaJeff sigue activo",
        content: "Quedó trabajando junto al reloj para enviar notificaciones."
      });
    }

    return {
      ok: true,
      message: "Ventana oculta. AgendaJeff sigue activo en segundo plano.",
      hiddenAt: nowIso()
    };
  }

  function quitApp() {
    if (typeof deps.requestQuit === "function") {
      deps.requestQuit();
    } else {
      app.quit();
    }

    return { ok: true, message: "Cerrando AgendaJeff completamente.", quitAt: nowIso() };
  }

  function testNotification() {
    if (deps.notificationService && typeof deps.notificationService.test === "function") {
      return deps.notificationService.test({ title: "AgendaJeff", body: "Prueba enviada desde el menú de bandeja." });
    }

    return showTrayBalloon({ title: "AgendaJeff", content: "Prueba enviada desde el menú de bandeja." });
  }

  function getStatus() {
    const mainWindow = getMainWindow();
    return {
      ok: true,
      exists: Boolean(tray),
      tooltip: CONFIG.tray?.tooltip || "AgendaJeff activo",
      windowAvailable: Boolean(mainWindow && !mainWindow.isDestroyed()),
      windowVisible: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()),
      checkedAt: nowIso()
    };
  }

  function refreshMenu() {
    if (!tray) return getStatus();

    const labels = CONFIG.tray?.menu || {};
    const status = getStatus();
    const menu = Menu.buildFromTemplate([
      { label: labels.open || "Abrir AgendaJeff", click: showMainWindow },
      { label: labels.hide || "Ocultar ventana", click: hideMainWindow, enabled: status.windowAvailable && status.windowVisible },
      { type: "separator" },
      { label: labels.testNotification || "Probar notificación", click: testNotification },
      { label: status.windowVisible ? "Estado: visible" : "Estado: segundo plano", enabled: false },
      { type: "separator" },
      { label: labels.quit || "Salir completamente", click: quitApp }
    ]);

    tray.setContextMenu(menu);
    return getStatus();
  }

  function createTray() {
    if (tray) {
      refreshMenu();
      return getStatus();
    }

    if (CONFIG.tray && CONFIG.tray.enabled === false) {
      return { ok: false, exists: false, message: "El Tray está desactivado." };
    }

    tray = new Tray(createTrayImage());
    tray.setToolTip(CONFIG.tray?.tooltip || "AgendaJeff activo en segundo plano");
    tray.on("double-click", showMainWindow);
    refreshMenu();

    return { ...getStatus(), message: "Tray creado correctamente." };
  }

  function destroyTray() {
    if (tray) {
      tray.destroy();
      tray = null;
    }

    return { ok: true, exists: false, message: "Tray destruido.", destroyedAt: nowIso() };
  }

  function testTrayIcon() {
    const result = createTray();
    showTrayBalloon({ title: "AgendaJeff", content: "El ícono junto al reloj está activo." });
    return { ...result, test: "tray-icon" };
  }

  function testTrayMenu() {
    createTray();
    refreshMenu();
    return { ...getStatus(), test: "tray-menu", message: "Menú de bandeja actualizado correctamente." };
  }

  return {
    createTray,
    destroyTray,
    refreshMenu,
    getStatus,
    showMainWindow,
    hideMainWindow,
    showTrayBalloon,
    testTrayIcon,
    testTrayMenu,
    testNotification,
    quitApp
  };
}

module.exports = createBackgroundTrayService;
