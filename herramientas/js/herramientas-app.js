/*
  Nombre completo: herramientas-app.js
  Ruta: herramientas/js/herramientas-app.js

  Función:
    - Conectar la pantalla Herramientas con HT.Service.
    - Manejar botones de backup, restauración, reportes, deshacer y prueba completa.
*/

(function initHerramientasApp(global) {
  "use strict";

  const HT = global.HT = global.HT || {};

  const elements = {
    statusBadge: document.getElementById("htStatusBadge"),
    output: document.getElementById("htOutput"),
    previewUndoBtn: document.getElementById("htPreviewUndoBtn"),
    undoLastBatchBtn: document.getElementById("htUndoLastBatchBtn"),
    exportBackupBtn: document.getElementById("htExportBackupBtn"),
    restoreFileInput: document.getElementById("htRestoreFileInput"),
    restoreBackupBtn: document.getElementById("htRestoreBackupBtn"),
    replaceOnRestore: document.getElementById("htReplaceOnRestore"),
    exportExcelBtn: document.getElementById("htExportExcelBtn"),
    printReportBtn: document.getElementById("htPrintReportBtn"),
    runFullTestBtn: document.getElementById("htRunFullTestBtn"),
    refreshSummaryBtn: document.getElementById("htRefreshSummaryBtn")
  };

  function setStatus(type, text) {
    if (!elements.statusBadge) return;
    elements.statusBadge.className = `ht-status ht-status--${type || "idle"}`;
    elements.statusBadge.textContent = text || "Listo";
  }

  function setOutput(data) {
    if (!elements.output) return;
    elements.output.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  }

  function setBusy(isBusy) {
    document.querySelectorAll("button").forEach((button) => {
      button.disabled = Boolean(isBusy);
    });
  }

  function bindClick(element, handler) {
    if (!element || typeof handler !== "function") return;
    element.addEventListener("click", handler);
  }

  async function runAction(label, action) {
    setBusy(true);
    setStatus("idle", "Procesando");

    try {
      const result = await action();
      setStatus(result && result.ok === false ? "warning" : "ok", "Listo");
      setOutput({
        accion: label,
        ...(result || {})
      });
      return result;
    } catch (error) {
      setStatus("error", "Error");
      setOutput({
        accion: label,
        ok: false,
        message: error.message
      });
      return null;
    } finally {
      setBusy(false);
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
      reader.readAsText(file, "utf-8");
    });
  }

  async function previewUndo() {
    return runAction("Revisar última carga", () => HT.Service.previewUndoLastBatch());
  }

  async function undoLastBatch() {
    const preview = HT.Service.previewUndoLastBatch();

    if (!preview.ok) {
      setStatus("warning", "Sin carga");
      setOutput(preview);
      return;
    }

    const confirmMessage = [
      `Vas a deshacer el lote: ${preview.batchName}`,
      `Eventos locales a eliminar: ${preview.removable}`,
      "",
      "Esta acción elimina eventos del Agendador, pero no borra automáticamente eventos ya creados en Google/Microsoft.",
      "¿Deseas continuar?"
    ].join("\n");

    const accepted = global.confirm ? global.confirm(confirmMessage) : true;
    if (!accepted) return;

    return runAction("Deshacer última carga", () => HT.Service.undoLastBatch());
  }

  async function exportBackup() {
    return runAction("Exportar backup", () => HT.Service.exportBackup());
  }

  async function restoreBackup() {
    const file = elements.restoreFileInput && elements.restoreFileInput.files && elements.restoreFileInput.files[0]
      ? elements.restoreFileInput.files[0]
      : null;

    if (!file) {
      setStatus("warning", "Falta archivo");
      setOutput({ ok: false, message: "Selecciona un archivo JSON de backup." });
      return;
    }

    const accepted = global.confirm
      ? global.confirm("Vas a restaurar un backup de AgendaJeff. Recarga la app después de restaurar. ¿Continuar?")
      : true;

    if (!accepted) return;

    return runAction("Restaurar backup", async () => {
      const raw = await readFileAsText(file);
      const backup = JSON.parse(raw);
      return HT.Service.restoreBackupObject(backup, {
        replace: Boolean(elements.replaceOnRestore && elements.replaceOnRestore.checked)
      });
    });
  }

  async function exportExcel() {
    return runAction("Exportar Excel CSV", () => HT.Service.exportExcelCsv());
  }

  async function printReport() {
    return runAction("Reporte PDF / Imprimir", () => HT.Service.openPrintableReport());
  }

  async function runFullTest() {
    return runAction("Prueba completa", () => HT.Service.runFullTest());
  }

  function refreshSummary() {
    setStatus("idle", "Resumen");
    setOutput({
      ok: true,
      message: "Resumen actualizado.",
      summary: HT.Service.summarizeData(),
      lastBatch: HT.Service.previewUndoLastBatch()
    });
  }

  function bindEvents() {
    bindClick(elements.previewUndoBtn, previewUndo);
    bindClick(elements.undoLastBatchBtn, undoLastBatch);
    bindClick(elements.exportBackupBtn, exportBackup);
    bindClick(elements.restoreBackupBtn, restoreBackup);
    bindClick(elements.exportExcelBtn, exportExcel);
    bindClick(elements.printReportBtn, printReport);
    bindClick(elements.runFullTestBtn, runFullTest);
    bindClick(elements.refreshSummaryBtn, refreshSummary);
  }

  function init() {
    bindEvents();
    refreshSummary();
  }

  HT.App = {
    init,
    refreshSummary,
    previewUndo,
    undoLastBatch,
    exportBackup,
    restoreBackup,
    exportExcel,
    printReport,
    runFullTest
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
