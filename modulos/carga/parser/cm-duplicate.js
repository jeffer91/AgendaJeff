/* cm-duplicate.js · Depuración local de duplicados */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleOf(item) {
    return item && (item.actividad || item.titulo || item.title || item.descripcion || item.description || "");
  }

  function dateOf(item, key) {
    return String((item && item[key]) || "").slice(0, 10);
  }

  function timeOf(item, key) {
    return String((item && item[key]) || "").slice(0, 5);
  }

  function uniqueKey(item) {
    return [
      normalize(titleOf(item)),
      dateOf(item, "fechaInicio"),
      dateOf(item, "fechaFin") || dateOf(item, "fechaInicio"),
      timeOf(item, "horaInicio"),
      timeOf(item, "horaFin")
    ].join("|");
  }

  function similarity(a, b) {
    const left = normalize(a).split(" ").filter(Boolean);
    const right = new Set(normalize(b).split(" ").filter(Boolean));
    if (!left.length || !right.size) return 0;
    const hits = left.filter(function (word) { return right.has(word); }).length;
    return hits / Math.max(left.length, right.size);
  }

  function sameDateTime(a, b) {
    const startA = dateOf(a, "fechaInicio");
    const startB = dateOf(b, "fechaInicio");
    if (startA && startB && startA !== startB) return false;
    const endA = dateOf(a, "fechaFin") || startA;
    const endB = dateOf(b, "fechaFin") || startB;
    if (endA && endB && endA !== endB) return false;
    const hStartA = timeOf(a, "horaInicio");
    const hStartB = timeOf(b, "horaInicio");
    if (hStartA && hStartB && hStartA !== hStartB) return false;
    const hEndA = timeOf(a, "horaFin");
    const hEndB = timeOf(b, "horaFin");
    if (hEndA && hEndB && hEndA !== hEndB) return false;
    return true;
  }

  function isDuplicateOf(a, b, threshold) {
    if (!a || !b) return false;
    if (uniqueKey(a) === uniqueKey(b)) return true;
    if (!sameDateTime(a, b)) return false;
    return similarity(titleOf(a), titleOf(b)) >= (threshold || 0.9);
  }

  async function getExistingItems() {
    const bridge = carga.dom.bridge();
    if (!bridge || typeof bridge.queryAgendaItems !== "function") return [];
    const result = await bridge.queryAgendaItems({});
    return result && result.ok && result.data && Array.isArray(result.data.items) ? result.data.items : [];
  }

  async function findExistingDuplicate(candidate, existingItems) {
    const existing = Array.isArray(existingItems) ? existingItems : await getExistingItems();
    return existing.find(function eachExisting(item) { return isDuplicateOf(candidate, item, 0.88); }) || null;
  }

  function removeInternalDuplicates(list, report) {
    const kept = [];
    const seen = new Set();
    (Array.isArray(list) ? list : []).forEach(function eachCandidate(candidate) {
      const key = uniqueKey(candidate);
      const repeatedByKey = seen.has(key);
      const repeatedBySimilarity = kept.some(function eachKept(item) { return isDuplicateOf(candidate, item, 0.92); });
      if (repeatedByKey || repeatedBySimilarity) {
        report.internalRemoved += 1;
        return;
      }
      seen.add(key);
      kept.push(candidate);
    });
    return kept;
  }

  async function markDuplicates(candidates) {
    const original = Array.isArray(candidates) ? candidates : [];
    const report = {
      original: original.length,
      kept: 0,
      internalRemoved: 0,
      existingRemoved: 0,
      totalRemoved: 0
    };

    const withoutInternal = removeInternalDuplicates(original, report);
    const existing = await getExistingItems();
    const filtered = [];

    withoutInternal.forEach(function eachCandidate(candidate) {
      const existingMatch = existing.find(function eachExisting(item) { return isDuplicateOf(candidate, item, 0.88); });
      if (existingMatch) {
        report.existingRemoved += 1;
        return;
      }
      candidate.duplicateScore = 0;
      candidate.duplicate = false;
      if (candidate.status === "posible_duplicado") candidate.status = "listo";
      filtered.push(candidate);
    });

    report.kept = filtered.length;
    report.totalRemoved = report.internalRemoved + report.existingRemoved;
    carga.state = carga.state || {};
    carga.state.duplicateReport = report;
    return filtered;
  }

  carga.duplicates = Object.freeze({
    normalize,
    similarity,
    uniqueKey,
    isDuplicateOf,
    findExistingDuplicate,
    markDuplicates,
    getExistingItems
  });
})(window);
