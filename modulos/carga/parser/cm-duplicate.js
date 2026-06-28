/* cm-duplicate.js · Detección local de posibles duplicados */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function normalize(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  }

  function similarity(a, b) {
    const left = normalize(a).split(" ").filter(Boolean);
    const right = new Set(normalize(b).split(" ").filter(Boolean));
    if (!left.length || !right.size) return 0;
    const hits = left.filter(function (word) { return right.has(word); }).length;
    return hits / Math.max(left.length, right.size);
  }

  async function getExistingItems() {
    const bridge = carga.dom.bridge();
    if (!bridge || typeof bridge.queryAgendaItems !== "function") return [];
    const result = await bridge.queryAgendaItems({});
    return result && result.ok && result.data && Array.isArray(result.data.items) ? result.data.items : [];
  }

  async function markDuplicates(candidates) {
    const existing = await getExistingItems();
    const list = Array.isArray(candidates) ? candidates : [];

    list.forEach(function (candidate) {
      let best = 0;
      existing.forEach(function (item) {
        if (candidate.fechaInicio && item.fechaInicio && candidate.fechaInicio !== item.fechaInicio) return;
        best = Math.max(best, similarity(candidate.titulo, item.titulo));
      });
      candidate.duplicateScore = Number(best.toFixed(2));
      candidate.duplicate = best >= 0.65;
      if (candidate.duplicate && candidate.status === "listo") candidate.status = "posible_duplicado";
    });

    return list;
  }

  carga.duplicates = Object.freeze({ normalize, similarity, markDuplicates });
})(window);
