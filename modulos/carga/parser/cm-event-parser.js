/* cm-event-parser.js · Parser local simple para eventos */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function cleanLine(line) {
    return String(line || "").replace(/[\t|]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function statusFor(candidate) {
    if (!candidate.titulo && !candidate.fechaInicio) return "requiere_revision";
    if (!candidate.fechaInicio) return "falta_fecha";
    if (!candidate.titulo) return "falta_actividad";
    if (!candidate.horaInicio) return "falta_hora";
    return "listo";
  }

  function parseLine(line, source, index) {
    const text = cleanLine(line);
    const times = carga.dateParser.allTimes(text);
    const fechaInicio = carga.dateParser.firstDate(text);
    const tituloBase = carga.dateParser.removeKnownDateTime(text);
    const titulo = tituloBase || text.slice(0, 80);

    return {
      id: carga.dom.id("cand"),
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      row: index + 1,
      tipo: "evento",
      titulo,
      descripcion: text,
      fechaInicio,
      fechaFin: "",
      horaInicio: times[0] || "",
      horaFin: times[1] || "",
      todoDia: !times[0],
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
      origen: { tipo: source.type, archivo: source.name, textoOriginal: text },
      status: "",
      duplicate: false,
      duplicateScore: 0,
      selected: true
    };
  }

  function parseSource(source) {
    const text = String(source.text || "").trim();
    if (!text) {
      return [{
        id: carga.dom.id("cand"),
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        row: 1,
        tipo: "evento",
        titulo: source.name,
        descripcion: "Fuente registrada sin texto legible. Requiere revisión manual.",
        fechaInicio: "",
        fechaFin: "",
        horaInicio: "",
        horaFin: "",
        todoDia: true,
        categoria: "trabajo",
        canales: { escritorio: true, telegram: true, googleCalendar: true },
        recordatorios: { cincoDiasAntes: true, tresDiasAntes: true, unDiaAntes: true, mismoDia: true, usarDiasLaborables: false, horasSinHora: ["06:00", "13:00", "17:00"], horasPendiente: ["06:00", "17:00"] },
        origen: { tipo: source.type, archivo: source.name, textoOriginal: "" },
        status: "requiere_revision",
        duplicate: false,
        duplicateScore: 0,
        selected: false
      }];
    }

    return text.split(/\r?\n/).map(cleanLine).filter(Boolean).map(function mapLine(line, index) {
      const candidate = parseLine(line, source, index);
      candidate.status = statusFor(candidate);
      candidate.selected = candidate.status === "listo" || candidate.status === "falta_hora";
      return candidate;
    });
  }

  function parseSources(sources) {
    return (Array.isArray(sources) ? sources : []).flatMap(parseSource);
  }

  carga.eventParser = Object.freeze({ parseSource, parseSources, statusFor });
})(window);
