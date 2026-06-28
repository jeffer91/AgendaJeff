/*
  Nombre completo: aj-background-scheduler.js
  Ruta: electron/background/aj-background-scheduler.js

  Función:
    - Crear un temporizador simple y seguro para el segundo plano.
    - Evitar revisiones cada segundo para mantener bajo consumo.
*/

"use strict";

function createScheduler(options) {
  const config = options && typeof options === "object" ? options : {};
  const intervalMs = Number(config.intervalMs || 60000);
  const onTick = typeof config.onTick === "function" ? config.onTick : function noop() {};
  let timer = null;

  function start() {
    if (timer) return false;
    timer = setInterval(onTick, intervalMs);
    return true;
  }

  function stop() {
    if (!timer) return false;
    clearInterval(timer);
    timer = null;
    return true;
  }

  function isRunning() {
    return Boolean(timer);
  }

  return Object.freeze({ start, stop, isRunning, intervalMs });
}

module.exports = Object.freeze({ createScheduler });
