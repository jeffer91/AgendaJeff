/* dg-collector.js · Recolector de diagnóstico */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const diagnostico = root.Diagnostico = root.Diagnostico || {};

  function countBy(items, key) {
    return (Array.isArray(items) ? items : []).reduce(function (acc, item) {
      const value = item && item[key] ? item[key] : "sin_dato";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function lastItems(items) {
    return (Array.isArray(items) ? items.slice() : []).sort(function (a, b) {
      const left = (a.auditoria && a.auditoria.actualizadoEn) || a.creadoEn || "";
      const right = (b.auditoria && b.auditoria.actualizadoEn) || b.creadoEn || "";
      return String(right).localeCompare(String(left));
    }).slice(0, 8);
  }

  function area(name, ok, message, data) {
    return { name, ok: Boolean(ok), status: ok ? "ok" : "warning", message: message || "", data: data || null };
  }

  async function collect() {
    const bridge = diagnostico.dom.bridge();
    const report = {
      generatedAt: new Date().toISOString(),
      electron: null,
      notifications: null,
      background: null,
      local: null,
      stats: {
        eventos: 0,
        recordatorios: 0,
        pendientes: 0,
        sync: 0,
        errores: 0,
        queue: 0
      },
      areas: [],
      recent: []
    };

    if (!bridge) {
      report.areas.push(area("Electron", false, "Puente Electron no disponible. Abre la app de escritorio.", null));
      return report;
    }

    if (typeof bridge.getEnvironment === "function") {
      report.electron = await bridge.getEnvironment();
      report.areas.push(area("Electron", Boolean(report.electron && report.electron.ok), "Entorno Electron consultado.", report.electron));
    }

    if (typeof bridge.checkDesktopNotifications === "function") {
      report.notifications = await bridge.checkDesktopNotifications();
      report.areas.push(area("Notificaciones", Boolean(report.notifications && report.notifications.ok), report.notifications && report.notifications.message, report.notifications));
    }

    if (typeof bridge.getBackgroundStatus === "function") {
      report.background = await bridge.getBackgroundStatus();
      const bg = report.background && report.background.data ? report.background.data : {};
      report.areas.push(area("Segundo plano", Boolean(report.background && report.background.ok && bg.running), bg.running ? "Motor activo." : "Motor no activo o pendiente.", report.background));
    }

    if (typeof bridge.readAgendaData === "function") {
      report.local = await bridge.readAgendaData();
      const data = report.local && report.local.data && report.local.data.data ? report.local.data.data : {};
      const items = Array.isArray(data.items) ? data.items : [];
      const queue = Array.isArray(data.syncQueue) ? data.syncQueue : [];
      const byType = countBy(items, "tipo");
      const byState = countBy(items, "estado");
      const bySync = countBy(items, "estadoSync");

      report.stats.eventos = byType.evento || 0;
      report.stats.recordatorios = byType.recordatorio || 0;
      report.stats.pendientes = byType.pendiente || 0;
      report.stats.sync = bySync.pendiente_sincronizar || byState.pendiente_sincronizar || 0;
      report.stats.errores = (byState.error || 0) + (bySync.error || 0);
      report.stats.queue = queue.length;
      report.recent = lastItems(items);
      report.areas.push(area("Base local", Boolean(report.local && report.local.ok), `${items.length} registros locales.`, { byType, byState, bySync, queue: queue.length }));
    }

    report.areas.push(area("Módulos Agenda", true, "Inicio, Agenda, Carga Masiva, Ajustes y Diagnóstico separados por carpetas.", null));
    report.areas.push(area("Conexiones", true, "Telegram, Google Calendar y Notificaciones conservan sus módulos propios.", null));
    return report;
  }

  diagnostico.collector = Object.freeze({ collect, countBy });
})(window);
