/*
  Nombre completo: herramientas-service.js
  Ruta: herramientas/js/herramientas-service.js

  Función:
    - Centralizar funciones de Herramientas.
    - Deshacer última carga masiva.
    - Exportar backup JSON.
    - Restaurar backup JSON.
    - Generar reportes CSV/HTML.
    - Ejecutar prueba completa local sin crear eventos externos.
*/

(function initHerramientasService(global) {
  "use strict";

  const HT = global.HT = global.HT || {};

  const CONFIG = {
    APP_NAME: "AgendaJeff",
    VERSION: "1.0.0",
    KEYS: {
      AG_ITEMS: "ag_agendador_items_v1",
      AG_RESPONSIBLES: "ag_agendador_responsibles_v1",
      AG_CONNECTION_STATUS: "ag_agendador_connection_status_v1",
      AG_ACTIVE_FILTER: "ag_agendador_active_filter_v1",
      AG_SETTINGS: "ag_agendador_settings_v1",
      CM_BATCHES: "agendajeff_cm_batches_v1",
      CM_DRAFT_EVENTS: "agendajeff_cm_draft_events_v1",
      CM_LAST_BATCH_ID: "agendajeff_cm_last_batch_id_v1",
      CM_UNDO_HISTORY: "agendajeff_cm_undo_history_v1",
      TL_CONNECTION: "tl_telegram_connection_v1",
      GC_CONNECTION: "gc_google_calendar_connection_v1",
      MC_CONNECTION: "mc_microsoft_calendar_connection_v1",
      NT_SETTINGS: "nt_desktop_notifications_settings_v1"
    },
    BACKUP_PREFIXES: ["ag_", "agendajeff_", "tl_", "gc_", "mc_", "nt_"]
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function safeJsonParse(rawValue, fallbackValue) {
    try {
      if (!rawValue) return fallbackValue;
      return JSON.parse(rawValue);
    } catch (_error) {
      return fallbackValue;
    }
  }

  function readJSON(key, fallbackValue) {
    return safeJsonParse(global.localStorage.getItem(key), fallbackValue);
  }

  function writeJSON(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function getElectronBridge() {
    try {
      if (global.AgendaJeffElectron) return global.AgendaJeffElectron;
    } catch (_error) {}

    try {
      if (global.parent && global.parent.AgendaJeffElectron) return global.parent.AgendaJeffElectron;
    } catch (_error) {}

    try {
      if (global.top && global.top.AgendaJeffElectron) return global.top.AgendaJeffElectron;
    } catch (_error) {}

    return null;
  }

  function downloadText(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function readItems() {
    const items = readJSON(CONFIG.KEYS.AG_ITEMS, []);
    return Array.isArray(items) ? items : [];
  }

  function saveItems(items) {
    return writeJSON(CONFIG.KEYS.AG_ITEMS, Array.isArray(items) ? items : []);
  }

  function readBatches() {
    const batches = readJSON(CONFIG.KEYS.CM_BATCHES, []);
    return Array.isArray(batches) ? batches : [];
  }

  function saveBatches(batches) {
    return writeJSON(CONFIG.KEYS.CM_BATCHES, Array.isArray(batches) ? batches : []);
  }

  function readLastBatchId() {
    return normalizeText(global.localStorage.getItem(CONFIG.KEYS.CM_LAST_BATCH_ID));
  }

  function findLastBatch() {
    const lastBatchId = readLastBatchId();
    const batches = readBatches();
    return batches.find((batch) => batch && batch.id === lastBatchId) || null;
  }

  function belongsToBatch(item, batchId) {
    const safeItem = item || {};
    const cm = safeItem.cm || {};
    const cleanBatchId = normalizeText(batchId);

    return normalizeText(cm.batchId) === cleanBatchId || normalizeText(safeItem.batchId) === cleanBatchId;
  }

  function previewUndoLastBatch() {
    const batch = findLastBatch();

    if (!batch) {
      return { ok: false, message: "No existe una última carga masiva para revisar." };
    }

    const items = readItems();
    const removableItems = items.filter((item) => belongsToBatch(item, batch.id));

    return {
      ok: true,
      batchId: batch.id,
      batchName: batch.name || "Carga masiva",
      batchStatus: batch.status || "",
      removable: removableItems.length,
      totalAgendador: items.length,
      sample: removableItems.slice(0, 10).map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        time: item.time
      }))
    };
  }

  async function syncElectronBackground() {
    const bridge = getElectronBridge();

    if (!bridge || !bridge.background || typeof bridge.background.syncReminders !== "function") {
      return { ok: false, skipped: true, message: "Electron no está disponible para sincronizar recordatorios." };
    }

    const reminders = readItems()
      .filter((item) => item && item.date && item.status !== "completed")
      .map((item) => ({
        id: `ht-${item.id || Math.random().toString(36).slice(2)}-0d`,
        itemId: item.id || "",
        title: item.title || "Recordatorio AgendaJeff",
        body: item.description || item.title || "Recordatorio AgendaJeff",
        reminderAt: `${item.date}T${item.time || "08:00"}:00`,
        triggerAt: `${item.date}T${item.time || "08:00"}:00`,
        channels: Array.isArray(item.channels) ? item.channels : ["desktopNotifications"],
        source: "herramientas-sync"
      }));

    return bridge.background.syncReminders(reminders);
  }

  async function undoLastBatch() {
    const batch = findLastBatch();

    if (!batch) throw new Error("No existe una última carga masiva para deshacer.");
    if (batch.status === "undone") throw new Error("La última carga ya fue deshecha anteriormente.");

    const items = readItems();
    const removedItems = items.filter((item) => belongsToBatch(item, batch.id));
    const remainingItems = items.filter((item) => !belongsToBatch(item, batch.id));

    if (!removedItems.length) {
      throw new Error("No se encontraron eventos locales del último lote en el Agendador.");
    }

    saveItems(remainingItems);

    const batches = readBatches().map((currentBatch) => {
      if (!currentBatch || currentBatch.id !== batch.id) return currentBatch;
      return {
        ...currentBatch,
        status: "undone",
        undoneAt: nowIso(),
        removedLocalItems: removedItems.length,
        undoMessage: `Se eliminaron ${removedItems.length} eventos locales del Agendador.`
      };
    });
    saveBatches(batches);

    const history = readJSON(CONFIG.KEYS.CM_UNDO_HISTORY, []);
    const nextHistory = [{
      id: `undo_${Date.now()}`,
      batchId: batch.id,
      batchName: batch.name || "Carga masiva",
      removed: removedItems.length,
      removedIds: removedItems.map((item) => item.id),
      undoneAt: nowIso()
    }].concat(Array.isArray(history) ? history : []).slice(0, 80);
    writeJSON(CONFIG.KEYS.CM_UNDO_HISTORY, nextHistory);

    const background = await syncElectronBackground();

    return {
      ok: true,
      message: `Última carga deshecha: ${removedItems.length} eventos eliminados del Agendador.`,
      batchId: batch.id,
      removed: removedItems.length,
      remaining: remainingItems.length,
      background
    };
  }

  function shouldBackupKey(key) {
    return CONFIG.BACKUP_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  function createBackupObject() {
    const entries = {};

    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (!key || !shouldBackupKey(key)) continue;
      entries[key] = global.localStorage.getItem(key);
    }

    return {
      app: CONFIG.APP_NAME,
      type: "AgendaJeffBackup",
      version: CONFIG.VERSION,
      exportedAt: nowIso(),
      totalKeys: Object.keys(entries).length,
      entries
    };
  }

  function exportBackup() {
    const backup = createBackupObject();
    const filename = `AgendaJeff_backup_${new Date().toISOString().slice(0, 10)}.json`;
    downloadText(filename, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
    return { ok: true, message: "Backup JSON exportado correctamente.", filename, totalKeys: backup.totalKeys, exportedAt: backup.exportedAt };
  }

  function clearKnownKeys() {
    const keysToRemove = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (key && shouldBackupKey(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => global.localStorage.removeItem(key));
    return keysToRemove.length;
  }

  function restoreBackupObject(backup, options) {
    const safeBackup = backup || {};
    const entries = safeBackup.entries || {};
    const keys = Object.keys(entries);

    if (safeBackup.type !== "AgendaJeffBackup" || !keys.length) {
      throw new Error("El archivo no parece ser un backup válido de AgendaJeff.");
    }

    let removedBeforeRestore = 0;
    if (options && options.replace === true) removedBeforeRestore = clearKnownKeys();

    keys.forEach((key) => {
      if (shouldBackupKey(key)) global.localStorage.setItem(key, String(entries[key]));
    });

    return { ok: true, message: "Backup restaurado correctamente. Recarga la app para ver todos los cambios.", restoredKeys: keys.length, removedBeforeRestore, importedAt: nowIso() };
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, "" + "\"\"")}"`;
  }

  function createReportRows() {
    return readItems().map((item) => ({
      id: item.id || "",
      tipo: item.type || "",
      titulo: item.title || "",
      fecha: item.date || "",
      hora: item.time || "",
      prioridad: item.priority || "",
      estado: item.status || "",
      responsable: item.responsible && item.responsible.name ? item.responsible.name : "",
      origen: item.origin || item.source || "",
      lote: item.cm && item.cm.batchId ? item.cm.batchId : "",
      canales: Array.isArray(item.channels) ? item.channels.join(" | ") : "",
      descripcion: item.description || ""
    }));
  }

  function exportExcelCsv() {
    const rows = createReportRows();
    const headers = ["id", "tipo", "titulo", "fecha", "hora", "prioridad", "estado", "responsable", "origen", "lote", "canales", "descripcion"];
    const csv = [headers.join(",")]
      .concat(rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")))
      .join("\n");
    const filename = `AgendaJeff_reporte_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(filename, `\ufeff${csv}`, "text/csv;charset=utf-8");
    return { ok: true, message: "Reporte CSV compatible con Excel exportado correctamente.", filename, totalRows: rows.length };
  }

  function summarizeData() {
    const items = readItems();
    const batches = readBatches();
    const today = new Date().toISOString().slice(0, 10);

    return {
      items: {
        total: items.length,
        active: items.filter((item) => item.status === "active").length,
        completed: items.filter((item) => item.status === "completed").length,
        today: items.filter((item) => item.date === today).length,
        fromCargaMasiva: items.filter((item) => item.origin === "cargaMasiva" || item.source === "cargaMasiva").length
      },
      batches: {
        total: batches.length,
        imported: batches.filter((batch) => batch.status === "imported").length,
        undone: batches.filter((batch) => batch.status === "undone").length,
        errors: batches.filter((batch) => batch.status === "error").length
      },
      connections: {
        telegramSaved: Boolean(global.localStorage.getItem(CONFIG.KEYS.TL_CONNECTION)),
        googleSaved: Boolean(global.localStorage.getItem(CONFIG.KEYS.GC_CONNECTION)),
        microsoftSaved: Boolean(global.localStorage.getItem(CONFIG.KEYS.MC_CONNECTION)),
        notificationsSaved: Boolean(global.localStorage.getItem(CONFIG.KEYS.NT_SETTINGS))
      },
      generatedAt: nowIso()
    };
  }

  function createPrintableReportHtml() {
    const summary = summarizeData();
    const rows = createReportRows();
    const tableRows = rows.slice(0, 300).map((row) => `
      <tr><td>${row.tipo}</td><td>${row.titulo}</td><td>${row.fecha}</td><td>${row.hora}</td><td>${row.estado}</td><td>${row.origen}</td></tr>`).join("");

    return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Reporte AgendaJeff</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:28px}h1{margin:0 0 6px}small{color:#64748b}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card{border:1px solid #dbe3ef;border-radius:12px;padding:12px}strong{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #dbe3ef;padding:8px;text-align:left;font-size:12px}th{background:#eff6ff}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Guardar como PDF / Imprimir</button><h1>Reporte AgendaJeff</h1><small>Generado: ${summary.generatedAt}</small><div class="grid"><div class="card"><span>Total registros</span><br><strong>${summary.items.total}</strong></div><div class="card"><span>Activos</span><br><strong>${summary.items.active}</strong></div><div class="card"><span>Hoy</span><br><strong>${summary.items.today}</strong></div><div class="card"><span>Cargas importadas</span><br><strong>${summary.batches.imported}</strong></div></div><h2>Conexiones</h2><ul><li>Telegram: ${summary.connections.telegramSaved ? "Configurado" : "Pendiente"}</li><li>Google: ${summary.connections.googleSaved ? "Configurado" : "Pendiente"}</li><li>Microsoft: ${summary.connections.microsoftSaved ? "Configurado" : "Pendiente"}</li><li>Notificaciones: ${summary.connections.notificationsSaved ? "Configurado" : "Pendiente"}</li></ul><h2>Registros</h2><table><thead><tr><th>Tipo</th><th>Título</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Origen</th></tr></thead><tbody>${tableRows || "<tr><td colspan='6'>Sin registros.</td></tr>"}</tbody></table></body></html>`;
  }

  function openPrintableReport() {
    const reportWindow = global.open("", "_blank");
    if (!reportWindow) throw new Error("El navegador bloqueó la ventana del reporte. Permite ventanas emergentes.");
    reportWindow.document.open();
    reportWindow.document.write(createPrintableReportHtml());
    reportWindow.document.close();
    return { ok: true, message: "Reporte imprimible abierto. Usa el botón Guardar como PDF / Imprimir.", openedAt: nowIso() };
  }

  function testLocalStorage() {
    const key = "agendajeff_ht_test_key";
    global.localStorage.setItem(key, "ok");
    const ok = global.localStorage.getItem(key) === "ok";
    global.localStorage.removeItem(key);
    return ok;
  }

  async function runFullTest() {
    const summary = summarizeData();
    const results = [];

    results.push({ name: "localStorage", ok: testLocalStorage(), message: "Lectura y escritura local." });
    results.push({ name: "Agendador", ok: Array.isArray(readItems()), total: summary.items.total, message: `Registros locales encontrados: ${summary.items.total}` });
    results.push({ name: "Carga Masiva", ok: Array.isArray(readBatches()), total: summary.batches.total, message: `Lotes encontrados: ${summary.batches.total}` });
    results.push({ name: "Telegram", ok: summary.connections.telegramSaved, message: summary.connections.telegramSaved ? "Configuración local detectada." : "Sin configuración local." });
    results.push({ name: "Google Calendar", ok: summary.connections.googleSaved, message: summary.connections.googleSaved ? "Configuración local detectada." : "Sin configuración local." });
    results.push({ name: "Microsoft Calendar", ok: summary.connections.microsoftSaved, message: summary.connections.microsoftSaved ? "Configuración local detectada." : "Sin configuración local." });

    let electronStatus = { ok: false, skipped: true, message: "No se detectó puente Electron." };
    try {
      const bridge = getElectronBridge();
      if (bridge && bridge.background && typeof bridge.background.getStatus === "function") electronStatus = await bridge.background.getStatus();
    } catch (error) {
      electronStatus = { ok: false, message: error.message };
    }

    results.push({ name: "Segundo plano Electron", ok: Boolean(electronStatus && electronStatus.ok), message: electronStatus && electronStatus.message ? electronStatus.message : "Estado consultado.", data: electronStatus });
    results.push({ name: "Reporte", ok: createReportRows().length === summary.items.total, message: "Reporte generado en memoria correctamente." });

    const criticalOk = results.filter((item) => ["localStorage", "Agendador", "Carga Masiva", "Reporte"].includes(item.name)).every((item) => item.ok);

    return {
      ok: criticalOk,
      message: criticalOk ? "Prueba completa finalizada. La base local está funcional." : "La prueba completa detectó problemas en funciones críticas.",
      results,
      summary,
      testedAt: nowIso()
    };
  }

  HT.CONFIG = CONFIG;
  HT.Service = {
    readJSON,
    writeJSON,
    readItems,
    saveItems,
    readBatches,
    saveBatches,
    findLastBatch,
    previewUndoLastBatch,
    undoLastBatch,
    createBackupObject,
    exportBackup,
    restoreBackupObject,
    exportExcelCsv,
    createPrintableReportHtml,
    openPrintableReport,
    summarizeData,
    runFullTest
  };
})(window);
