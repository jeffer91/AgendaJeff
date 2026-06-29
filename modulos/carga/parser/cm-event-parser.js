/* cm-event-parser.js · Parser local inteligente para cronogramas y defensas */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeHeader(text) {
    return cleanText(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function toCells(line) {
    const raw = String(line || "");
    const splitter = raw.indexOf("\t") >= 0 ? /\t/ : /\s{2,}/;
    const cells = raw.split(splitter).map(function trim(cell) { return cleanText(cell); });
    while (cells.length && !cells[cells.length - 1]) cells.pop();
    return cells;
  }

  function cell(cells, index) {
    return index >= 0 && index < cells.length ? cleanText(cells[index]) : "";
  }

  function makeMap(cells) {
    const map = { tribunalIndexes: [], extraIndexes: [] };
    cells.forEach(function eachHeader(header, index) {
      const key = normalizeHeader(header);
      if (!key) return;
      if (key === "actividad" || key === "actividad descripcion") map.actividad = index;
      else if (key === "dia" || key === "día" || key === "fecha" || key === "fecha inicio" || key.includes("fecha inicio")) map.fechaInicio = index;
      else if (key === "fecha fin" || key.includes("fecha fin")) map.fechaFin = index;
      else if (key === "hora" || key.includes("hora")) map.hora = index;
      else if (key === "aula") map.aula = index;
      else if (key === "sede" || key === "modalidad") map.sede = index;
      else if (key === "cedula" || key === "cedula identidad" || key === "cédula") map.cedula = index;
      else if (key === "nombre" || key.includes("estudiante")) map.nombre = index;
      else if (key === "carrera") map.carrera = index;
      else if (key === "responsable") map.responsable = index;
      else if (key.includes("tribunal")) map.tribunalIndexes.push(index);
      else map.extraIndexes.push(index);
    });
    return map;
  }

  function headerMode(map) {
    if (typeof map.actividad === "number" && typeof map.fechaInicio === "number") return "cronograma";
    if (typeof map.fechaInicio === "number" && typeof map.hora === "number" && typeof map.nombre === "number") return "defensa";
    return "";
  }

  function isHeader(cells) {
    const map = makeMap(cells);
    return Boolean(headerMode(map));
  }

  function statusFor(candidate) {
    const actividad = candidate && (candidate.actividad || candidate.titulo);
    if (!actividad && !candidate.fechaInicio) return "requiere_revision";
    if (!candidate.fechaInicio) return "falta_fecha";
    if (!actividad) return "falta_actividad";
    return "listo";
  }

  function baseCandidate(input) {
    const data = input || {};
    const actividad = cleanText(data.actividad || data.titulo || "");
    return {
      id: carga.dom.id("cand"),
      sourceId: data.sourceId,
      sourceName: data.sourceName,
      sourceType: data.sourceType,
      row: data.row || 1,
      tipo: "evento",
      actividad,
      titulo: actividad,
      descripcion: cleanText(data.descripcion || data.textoOriginal || actividad),
      fechaInicio: data.fechaInicio || "",
      fechaFin: data.fechaFin || data.fechaInicio || "",
      horaInicio: data.horaInicio || "",
      horaFin: data.horaFin || "",
      todoDia: !data.horaInicio,
      categoria: "trabajo",
      canales: { escritorio: true, telegram: true, googleCalendar: true },
      recordatorios: {
        cincoDiasAntes: true,
        tresDiasAntes: true,
        unDiaAntes: true,
        mismoDia: true,
        usarDiasLaborables: false,
        horasSinHora: ["06:00", "13:00", "17:00"],
        horasPendiente: ["06:00", "17:00"]
      },
      origen: { tipo: data.sourceType, archivo: data.sourceName, textoOriginal: data.textoOriginal || "" },
      status: "",
      duplicate: false,
      duplicateScore: 0,
      selected: data.selected !== false
    };
  }

  function buildActivity(parts) {
    const output = [];
    parts.forEach(function add(part) {
      const value = cleanText(part);
      if (value && !output.includes(value)) output.push(value);
    });
    return output.join(" · ");
  }

  function contextText(context) {
    const list = Array.isArray(context) ? context : [];
    return list.slice(-3).filter(Boolean).join(" · ");
  }

  function parseCronogramaRow(cells, source, index, active, rawLine) {
    const map = active.map || {};
    const actividadBase = cell(cells, map.actividad);
    const fechaInicio = carga.dateParser.firstDate(cell(cells, map.fechaInicio) || rawLine);
    const fechaFin = carga.dateParser.firstDate(cell(cells, map.fechaFin)) || fechaInicio;
    if (!actividadBase && !fechaInicio) return null;

    const range = carga.dateParser.timeRange(cell(cells, map.hora) || rawLine);
    const extras = [];
    if (typeof map.responsable === "number" && cell(cells, map.responsable)) extras.push(`Responsable: ${cell(cells, map.responsable)}`);
    (map.extraIndexes || []).forEach(function addExtra(extraIndex) {
      const value = cell(cells, extraIndex);
      if (value) extras.push(value);
    });

    const actividad = buildActivity([contextText(active.context), actividadBase].concat(extras));
    const candidate = baseCandidate({
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      row: index + 1,
      actividad,
      descripcion: buildActivity([actividad, rawLine]),
      fechaInicio,
      fechaFin,
      horaInicio: range.horaInicio,
      horaFin: range.horaFin,
      textoOriginal: rawLine,
      selected: true
    });
    candidate.status = statusFor(candidate);
    return candidate;
  }

  function parseDefenseRow(cells, source, index, active, rawLine) {
    const map = active.map || {};
    const fechaInicio = carga.dateParser.firstDate(cell(cells, map.fechaInicio) || rawLine);
    if (!fechaInicio) return null;
    const range = carga.dateParser.timeRange(cell(cells, map.hora) || rawLine);
    const nombre = cell(cells, map.nombre);
    const carrera = cell(cells, map.carrera) || contextText(active.context);
    const cedula = cell(cells, map.cedula);
    const aula = cell(cells, map.aula);
    const sede = cell(cells, map.sede);
    const tribunales = (map.tribunalIndexes || []).map(function getTribunal(tribunalIndex) { return cell(cells, tribunalIndex); }).filter(Boolean);

    const actividad = buildActivity([
      "Defensa oral",
      nombre,
      carrera,
      cedula ? `Cédula: ${cedula}` : "",
      sede ? `Sede: ${sede}` : "",
      aula ? `Aula: ${aula}` : "",
      tribunales.length ? `Tribunales: ${tribunales.join(", ")}` : ""
    ]);

    const candidate = baseCandidate({
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      row: index + 1,
      actividad,
      descripcion: buildActivity([actividad, rawLine]),
      fechaInicio,
      fechaFin: fechaInicio,
      horaInicio: range.horaInicio,
      horaFin: range.horaFin,
      textoOriginal: rawLine,
      selected: true
    });
    candidate.status = statusFor(candidate);
    return candidate;
  }

  function parseGenericLine(line, source, index) {
    const text = cleanText(line);
    if (!text || isHeader(toCells(text))) return null;
    const dates = carga.dateParser.allDates(text);
    if (!dates.length) return null;
    const range = carga.dateParser.timeRange(text);
    const actividadBase = carga.dateParser.removeKnownDateTime(text) || text.slice(0, 120);
    const candidate = baseCandidate({
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      row: index + 1,
      actividad: actividadBase,
      descripcion: text,
      fechaInicio: dates[0] || "",
      fechaFin: dates[1] || dates[0] || "",
      horaInicio: range.horaInicio,
      horaFin: range.horaFin,
      textoOriginal: text,
      selected: true
    });
    candidate.status = statusFor(candidate);
    return candidate;
  }

  function isContextLine(line, cells) {
    if (!line || carga.dateParser.firstDate(line)) return false;
    if (isHeader(cells)) return false;
    if (cells.length <= 2) return true;
    return false;
  }

  function parseSource(source) {
    const text = String(source.text || "").trim();
    if (!text) {
      const candidate = baseCandidate({
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        row: 1,
        actividad: source.name,
        descripcion: "Fuente registrada sin texto legible. Requiere revisión manual.",
        textoOriginal: "",
        selected: false
      });
      candidate.status = "requiere_revision";
      return [candidate];
    }

    const lines = text.split(/\r?\n/);
    const candidates = [];
    let active = null;
    let context = [];

    lines.forEach(function eachLine(originalLine, index) {
      const rawLine = String(originalLine || "").trim();
      if (!rawLine) return;
      const cells = toCells(rawLine);

      if (isHeader(cells)) {
        const map = makeMap(cells);
        active = { mode: headerMode(map), map, context: context.slice(-3) };
        return;
      }

      let candidate = null;
      if (active && active.mode === "cronograma") candidate = parseCronogramaRow(cells, source, index, active, rawLine);
      if (active && active.mode === "defensa") candidate = parseDefenseRow(cells, source, index, active, rawLine);
      if (!candidate) candidate = parseGenericLine(rawLine, source, index);

      if (candidate) {
        candidates.push(candidate);
        return;
      }

      if (isContextLine(rawLine, cells)) {
        context.push(cleanText(rawLine));
        context = context.slice(-3);
        if (active) active.context = context.slice(-3);
      }
    });

    return candidates;
  }

  function parseSources(sources) {
    return (Array.isArray(sources) ? sources : []).flatMap(parseSource);
  }

  carga.eventParser = Object.freeze({ parseSource, parseSources, statusFor, toCells, normalizeHeader });
})(window);
