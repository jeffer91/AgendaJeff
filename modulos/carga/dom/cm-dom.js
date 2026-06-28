/* cm-dom.js · Helper DOM para Carga Masiva */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function el(id) { return global.document ? global.document.getElementById(id) : null; }
  function text(id, value) { const node = el(id); if (node) node.textContent = value == null ? "" : String(value); }
  function html(id, value) { const node = el(id); if (node) node.innerHTML = value || ""; }
  function safe(value) {
    return String(value || "").replace(/[&<>]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char];
    });
  }
  function bridge() {
    try {
      return global.AgendaJeffElectron || (global.parent && global.parent.AgendaJeffElectron) || null;
    } catch (error) {
      return null;
    }
  }
  function id(prefix) { return `${prefix || "cm"}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
  function status(title, description, badge) {
    text("cmStatusTitle", title || "Carga Masiva");
    text("cmStatusDescription", description || "");
    if (badge) text("cmStatusBadge", badge);
  }

  carga.dom = Object.freeze({ el, text, html, safe, bridge, id, status });
})(window);
