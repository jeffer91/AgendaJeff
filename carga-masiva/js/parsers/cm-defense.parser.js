/*
  Nombre completo: cm-defense.parser.js
  Ruta: carga-masiva/js/parsers/cm-defense.parser.js

  Función:
    - Procesar tablas de defensas por estudiante.
    - Reconocer columnas:
      Aula, Día, Hora, Sede, Cédula, Nombre, Carrera, Tribunal 1 y Tribunal 2.
    - Soportar bloques repetidos con encabezados repetidos.
    - Crear un evento tipo defense por cada fila.
    - Preparar lugar, estudiante, carrera, cédula y tribunales.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-table.parser.js
    - cm-app.js
*/

(function initCmDefenseParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function normalizeHeader(value) {
    return CM.safeString(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function splitLines(text) {
    return CM.safeString(text)
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function splitRow(line) {
    if (line.includes("\t")) {
      return line.split("\t").map((cell) => cell.trim());
    }

    if (line.includes("|")) {
      return line.split("|").map((cell) => cell.trim());
    }

    if (line.includes(";")) {
      return line.split(";").map((cell) => cell.trim());
    }

    return line.split(/\s{2,}/).map((cell) => cell.trim());
  }

  function isHeader(cells) {
    const joined = cells.map(normalizeHeader).join(" ");

    return (
      joined.includes("aula") &&
      joined.includes("hora") &&
      joined.includes("nombre") &&
      joined.includes("carrera")
    );
  }

  function mapHeaderIndexes(headers) {
    const normalized = headers.map(normalizeHeader);

    function findOne(names) {
      return normalized.findIndex((header) => names.some((name) => header === name || header.includes(name)));
    }

    return {
      classroom: findOne(["aula"]),
      date: findOne(["dia", "día", "fecha"]),
      time: findOne(["hora", "horario"]),
      campus: findOne(["sede", "modalidad"]),
      idNumber: findOne(["cedula", "cédula", "identificacion", "identificación"]),
      studentName: findOne(["nombre", "estudiante"]),
      career: findOne(["carrera"]),
      tribunal1: findOne(["tribunal 1", "tribunal1"]),
      tribunal2: findOne(["tribunal 2", "tribunal2"])
    };
  }

  function getCell(cells, index) {
    if (index < 0) {
      return "";
    }

    return cells[index] || "";
  }

  function buildDefenseEvent(cells, map, line, lineNumber) {
    const classroom = getCell(cells, map.classroom);
    const date = getCell(cells, map.date);
    const timeRange = getCell(cells, map.time);
    const campus = getCell(cells, map.campus);
    const idNumber = getCell(cells, map.idNumber);
    const studentName = getCell(cells, map.studentName);
    const career = getCell(cells, map.career);
    const tribunal1 = getCell(cells, map.tribunal1);
    const tribunal2 = getCell(cells, map.tribunal2);

    if (!date && !studentName && !career) {
      return null;
    }

    return {
      id: CM.createId("cm_raw_defense"),
      type: CONFIG.EVENT_TYPES.DEFENSE,
      aula: classroom,
      dia: date,
      hora: timeRange,
      sede: campus,
      cedula: idNumber,
      nombre: studentName,
      carrera: career,
      tribunal1,
      tribunal2,
      responsible: "Titulación",
      raw: line,
      line: lineNumber,
      sourceType: CONFIG.SOURCE_TYPES.DEFENSE
    };
  }

  function parseWithRepeatedHeaders(text) {
    const lines = splitLines(text);
    const events = [];
    const warnings = [];

    let headers = [];
    let map = null;

    lines.forEach((line, index) => {
      const cells = splitRow(line);

      if (!cells.length) {
        return;
      }

      if (isHeader(cells)) {
        headers = cells;
        map = mapHeaderIndexes(headers);
        return;
      }

      if (!map) {
        return;
      }

      const event = buildDefenseEvent(cells, map, line, index + 1);

      if (event) {
        events.push(event);
      }
    });

    if (!events.length) {
      warnings.push("No se detectaron defensas en la tabla.");
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.DEFENSE,
      events,
      warnings,
      period: "",
      phase: ""
    };
  }

  function parseFromTableObject(table) {
    const events = [];
    const warnings = [];
    const headers = table.headers || [];
    const map = mapHeaderIndexes(headers);

    table.rows.forEach((row, index) => {
      const event = {
        id: CM.createId("cm_raw_defense"),
        type: CONFIG.EVENT_TYPES.DEFENSE,
        aula: CM.TableParser.getValue(row, ["Aula"]),
        dia: CM.TableParser.getValue(row, ["Día", "Dia", "Fecha"]),
        hora: CM.TableParser.getValue(row, ["Hora", "Horario"]),
        sede: CM.TableParser.getValue(row, ["Sede", "Modalidad"]),
        cedula: CM.TableParser.getValue(row, ["Cédula", "Cedula"]),
        nombre: CM.TableParser.getValue(row, ["Nombre", "Estudiante"]),
        carrera: CM.TableParser.getValue(row, ["Carrera"]),
        tribunal1: CM.TableParser.getValue(row, ["Tribunal 1", "Tribunal1"]),
        tribunal2: CM.TableParser.getValue(row, ["Tribunal 2", "Tribunal2"]),
        responsible: "Titulación",
        raw: row.__raw || row,
        line: row.__line || index + 1,
        sourceType: CONFIG.SOURCE_TYPES.DEFENSE
      };

      if (event.dia || event.nombre || event.carrera) {
        events.push(event);
      }
    });

    if (!events.length) {
      warnings.push("No se detectaron defensas en la tabla.");
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.DEFENSE,
      events,
      warnings,
      period: "",
      phase: ""
    };
  }

  async function parse(text, payload) {
    const safePayload = payload || {};

    if (safePayload.table && Array.isArray(safePayload.table.rows)) {
      return parseFromTableObject(safePayload.table);
    }

    return parseWithRepeatedHeaders(text);
  }

  CM.DefenseParser = {
    normalizeHeader,
    splitLines,
    splitRow,
    isHeader,
    mapHeaderIndexes,
    buildDefenseEvent,
    parseWithRepeatedHeaders,
    parseFromTableObject,
    parse
  };
})(window);