/*
  Nombre completo: nt-normalize.js
  Ruta: modulos/notificaciones/utils/nt-normalize.js

  Función:
    - Normalizar datos antes de enviarlos como notificación.
*/

(function initNotificacionesNormalize(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const notificaciones = root.Notificaciones = root.Notificaciones || {};
  const utils = notificaciones.Utils = notificaciones.Utils || {};

  function asText(value, fallback) {
    const text = value === null || value === undefined ? "" : String(value).trim();
    return text || fallback || "";
  }

  function asNumber(value, fallback) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function normalizeType(value) {
    const config = notificaciones.CONFIG || {};
    const types = config.types || {};
    const text = asText(value, types.NORMAL || "normal");
    const supported = Object.keys(types).map(function mapType(key) { return types[key]; });
    return supported.includes(text) ? text : (types.NORMAL || "normal");
  }

  function normalizeDisplayMode(value) {
    const config = notificaciones.CONFIG || {};
    const modes = config.displayModes || {};
    const defaults = config.defaults || {};
    const text = asText(value, defaults.displayMode || modes.NATIVE || "native");
    const supported = Object.keys(modes).map(function mapMode(key) { return modes[key]; });
    return supported.includes(text) ? text : (defaults.displayMode || modes.NATIVE || "native");
  }

  function normalizePayload(input, options) {
    const config = notificaciones.CONFIG || {};
    const defaults = config.defaults || {};
    const data = input && typeof input === "object" ? input : {};
    const opts = options && typeof options === "object" ? options : {};
    const type = normalizeType(opts.type || data.type);
    const displayMode = normalizeDisplayMode(opts.displayMode || data.displayMode);
    const title = asText(data.title, defaults.title || "AgendaJeff");
    let body = asText(data.body || data.message, defaults.body || "notificaciones prueba");

    if (data.detail) {
      body = body + "\n\n" + asText(data.detail, "");
    }

    const delaySeconds = Math.max(0, asNumber(data.delaySeconds, defaults.delaySeconds || 0));
    const delayMs = Math.max(0, asNumber(data.delayMs, delaySeconds * 1000));

    return {
      title,
      body,
      type,
      displayMode,
      silent: Boolean(data.silent),
      delaySeconds,
      delayMs,
      createdAt: new Date().toISOString()
    };
  }

  utils.Normalize = Object.freeze({
    asText,
    asNumber,
    normalizeType,
    normalizeDisplayMode,
    normalizePayload
  });
})(window);