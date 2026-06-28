/* cm-source-manager.js · Fuentes para Carga Masiva */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  const state = carga.state = carga.state || { started: false, sources: [], candidates: [], selectedCandidateId: "" };

  function fileKind(file) {
    const name = (file && file.name ? file.name : "").toLowerCase();
    if (/\.(txt|csv)$/i.test(name)) return "texto";
    if (/\.(xls|xlsx)$/i.test(name)) return "excel";
    if (/\.(doc|docx)$/i.test(name)) return "word";
    if (/\.pdf$/i.test(name)) return "pdf";
    if (file && file.type && file.type.indexOf("image/") === 0) return "imagen";
    return "archivo";
  }

  function createSource(input) {
    const data = input || {};
    return {
      id: carga.dom.id("src"),
      type: data.type || "texto",
      name: data.name || "Texto pegado",
      size: data.size || 0,
      text: data.text || "",
      preview: (data.text || data.preview || "").slice(0, 220),
      status: data.status || "registrado",
      createdAt: new Date().toISOString()
    };
  }

  function addTextSource(text) {
    const clean = String(text || "").trim();
    if (!clean) return null;
    const source = createSource({ type: "texto", name: "Texto pegado", size: clean.length, text: clean, status: "listo" });
    state.sources.push(source);
    return source;
  }

  function readFileAsText(file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { resolve(""); };
      reader.readAsText(file);
    });
  }

  async function addFiles(files) {
    const list = Array.from(files || []);
    const added = [];
    for (const file of list) {
      const kind = fileKind(file);
      let text = "";
      let status = "requiere_revision";
      if (kind === "texto") {
        text = await readFileAsText(file);
        status = text ? "listo" : "requiere_revision";
      }
      const source = createSource({ type: kind, name: file.name, size: file.size || 0, text, preview: text || "Archivo registrado para revisión", status });
      state.sources.push(source);
      added.push(source);
    }
    return added;
  }

  function clearSources() {
    state.sources = [];
    state.candidates = [];
    state.selectedCandidateId = "";
  }

  function getSources() { return state.sources.slice(); }

  carga.sources = Object.freeze({ createSource, addTextSource, addFiles, clearSources, getSources, fileKind });
})(window);
