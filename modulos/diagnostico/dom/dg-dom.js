/* dg-dom.js · DOM helper Diagnóstico */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const diagnostico = root.Diagnostico = root.Diagnostico || {};

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
  function status(title, description, badge, kind) {
    const badgeNode = el("dgStatusBadge");
    text("dgStatusTitle", title || "Diagnóstico");
    text("dgStatusDescription", description || "");
    text("dgLastRun", new Date().toLocaleString());
    if (badgeNode) {
      badgeNode.textContent = badge || "Revisado";
      badgeNode.classList.remove("is-ok", "is-warning", "is-error");
      badgeNode.classList.add(kind || "is-ok");
    }
  }

  diagnostico.dom = Object.freeze({ el, text, html, safe, bridge, status });
})(window);
