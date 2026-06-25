/*
  Nombre completo: tl-time.js
  Ruta: modulos/telegram/utils/tl-time.js

  Función:
    - Centralizar fechas y tiempos del módulo Telegram.
    - Generar marcas ISO consistentes para Firebase, respaldo local y diagnóstico.
    - Evitar formatos de fecha distintos entre archivos.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/storage/*
    - modulos/telegram/firebase/*
    - modulos/telegram/connection/*
    - modulos/telegram/diagnostic/*
*/

(function initTelegramTimeUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const utils = telegram.Utils = telegram.Utils || {};

  function nowIso() {
    return new Date().toISOString();
  }

  function toIso(value) {
    if (!value) {
      return "";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString();
  }

  function safeTimestampLabel(value) {
    const iso = toIso(value) || nowIso();

    return iso
      .replace(/:/g, "-")
      .replace(/\./g, "-")
      .replace("T", "_")
      .replace("Z", "");
  }

  function ageInSeconds(value) {
    const iso = toIso(value);

    if (!iso) {
      return null;
    }

    const timestamp = new Date(iso).getTime();
    const current = Date.now();

    return Math.max(0, Math.round((current - timestamp) / 1000));
  }

  utils.Time = Object.freeze({
    nowIso,
    toIso,
    safeTimestampLabel,
    ageInSeconds
  });
})(window);
