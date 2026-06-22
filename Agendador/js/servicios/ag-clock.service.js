/*
  Nombre completo: ag-clock.service.js
  Ruta: Agendador/js/servicios/ag-clock.service.js

  Función:
    - Manejar el reloj del Agendador.
    - Entregar hora actual formateada.
    - Permitir iniciar y detener intervalo de reloj.
    - Preparar comparaciones entre hora actual y próximos eventos.
    - No guarda información.
    - Puede actualizar la UI usando AG.UI.setClock.

  Se conecta con:
    - ../ag-config.js
    - ../ag-ui.js
    - ag-event.service.js
*/

(function initAgClockService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  let intervalId = null;

  function getNow() {
    return new Date();
  }

  function formatTime(date) {
    const safeDate = date instanceof Date ? date : getNow();

    return safeDate.toLocaleTimeString(CONFIG.DATE_LOCALE, {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDate(date) {
    const safeDate = date instanceof Date ? date : getNow();

    return safeDate.toLocaleDateString(CONFIG.DATE_LOCALE, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function formatFull(date) {
    return `${formatDate(date)} · ${formatTime(date)}`;
  }

  function diffMinutesFromNow(date) {
    if (!(date instanceof Date)) {
      return null;
    }

    return Math.round((date.getTime() - Date.now()) / 60000);
  }

  function describeDistanceFromNow(date) {
    const diffMinutes = diffMinutesFromNow(date);

    if (diffMinutes === null) {
      return "Sin fecha";
    }

    if (diffMinutes < 0) {
      return "Ya pasó";
    }

    if (diffMinutes === 0) {
      return "Ahora";
    }

    if (diffMinutes < 60) {
      return `En ${diffMinutes} min`;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours < 24) {
      return minutes
        ? `En ${hours}h ${minutes}min`
        : `En ${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours
      ? `En ${days}d ${remainingHours}h`
      : `En ${days}d`;
  }

  function getNextItemDistance(items) {
    const nextItem = AG.EventService.findNextItem(items);
    const nextDate = nextItem ? AG.EventService.getItemDate(nextItem) : null;

    return {
      item: nextItem,
      date: nextDate,
      label: nextDate ? describeDistanceFromNow(nextDate) : "Sin eventos próximos"
    };
  }

  function tick(callback) {
    const now = getNow();

    if (AG.UI && typeof AG.UI.setClock === "function") {
      AG.UI.setClock(now);
    }

    if (typeof callback === "function") {
      callback(now);
    }

    return now;
  }

  function start(callback) {
    stop();

    tick(callback);

    intervalId = global.setInterval(() => {
      tick(callback);
    }, 1000);

    return intervalId;
  }

  function stop() {
    if (intervalId) {
      global.clearInterval(intervalId);
      intervalId = null;
    }
  }

  AG.ClockService = {
    getNow,
    formatTime,
    formatDate,
    formatFull,
    diffMinutesFromNow,
    describeDistanceFromNow,
    getNextItemDistance,
    tick,
    start,
    stop
  };
})(window);