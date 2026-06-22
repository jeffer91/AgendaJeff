/*
  Nombre completo: window-state.service.js
  Ruta: electron/window-state.service.js

  Función:
    - Guardar memoria del tamaño, posición y estado de la ventana de Electron.
    - Restaurar la ventana al abrir nuevamente la app.
    - Evitar que main.js tenga lógica repetida de lectura/escritura.
    - Trabajar solo con archivos locales de Electron, no con localStorage de las pantallas.

  Se conecta con:
    - electron/main.js
    - electron/electron-config.js
*/

"use strict";

const fs = require("fs");
const path = require("path");

function ensureDirectory(directoryPath) {
  if (!directoryPath) {
    return false;
  }

  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    return true;
  } catch (error) {
    return false;
  }
}

function createStatePath(app, config) {
  const userDataPath = app.getPath("userData");
  const fileName = config.memory.windowStateFile || "window-state.json";

  ensureDirectory(userDataPath);

  return path.join(userDataPath, fileName);
}

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function sanitizeState(rawState, config) {
  const fallbackWindow = config.window;

  const width = sanitizeNumber(rawState.width, fallbackWindow.width);
  const height = sanitizeNumber(rawState.height, fallbackWindow.height);
  const x = Number.isFinite(Number(rawState.x)) ? Number(rawState.x) : undefined;
  const y = Number.isFinite(Number(rawState.y)) ? Number(rawState.y) : undefined;

  const safeState = {
    width: Math.max(width, fallbackWindow.minWidth),
    height: Math.max(height, fallbackWindow.minHeight),
    isMaximized: Boolean(rawState.isMaximized),
    updatedAt: rawState.updatedAt || null
  };

  if (typeof x === "number") {
    safeState.x = x;
  }

  if (typeof y === "number") {
    safeState.y = y;
  }

  return safeState;
}

function readWindowState(app, config) {
  const statePath = createStatePath(app, config);

  try {
    if (!fs.existsSync(statePath)) {
      return sanitizeState({}, config);
    }

    const content = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(content);

    return sanitizeState(parsed || {}, config);
  } catch (error) {
    return sanitizeState({}, config);
  }
}

function writeWindowState(app, config, browserWindow) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return false;
  }

  const statePath = createStatePath(app, config);

  try {
    const bounds = browserWindow.getBounds();

    const payload = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: browserWindow.isMaximized(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(statePath, JSON.stringify(payload, null, 2), "utf8");

    return true;
  } catch (error) {
    return false;
  }
}

function createWindowOptionsFromState(app, config) {
  const state = readWindowState(app, config);

  const options = {
    width: state.width,
    height: state.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    center: config.window.center,
    show: false,
    backgroundColor: config.window.backgroundColor,
    title: config.app.title,
    titleBarStyle: config.window.titleBarStyle
  };

  if (typeof state.x === "number" && typeof state.y === "number") {
    options.x = state.x;
    options.y = state.y;
    options.center = false;
  }

  return {
    options,
    state
  };
}

function bindWindowState(app, config, browserWindow) {
  if (!browserWindow) {
    return;
  }

  let saveTimer = null;

  function scheduleSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      writeWindowState(app, config, browserWindow);
      saveTimer = null;
    }, 350);
  }

  browserWindow.on("resize", scheduleSave);
  browserWindow.on("move", scheduleSave);
  browserWindow.on("maximize", scheduleSave);
  browserWindow.on("unmaximize", scheduleSave);
  browserWindow.on("close", () => {
    writeWindowState(app, config, browserWindow);
  });
}

module.exports = {
  readWindowState,
  writeWindowState,
  createWindowOptionsFromState,
  bindWindowState
};