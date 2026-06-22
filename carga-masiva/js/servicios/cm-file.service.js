/*
  Nombre completo: cm-file.service.js
  Ruta: carga-masiva/js/servicios/cm-file.service.js

  Función:
    - Leer archivos cargados en la pantalla de Carga Masiva.
    - Detectar tipo de archivo por extensión.
    - Validar tamaño y extensión permitida.
    - Convertir archivos a texto, ArrayBuffer o DataURL según corresponda.
    - Preparar payload para parsers de Excel, PDF, Word e imagen.
    - No interpreta eventos; solo prepara el archivo.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-app.js
    - servicios/cm-parser.service.js
    - parsers/cm-excel.parser.js
    - parsers/cm-pdf.parser.js
    - parsers/cm-word.parser.js
    - parsers/cm-image.parser.js
*/

(function initCmFileService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function getExtension(fileName) {
    const name = CM.safeString(fileName).toLowerCase();
    const parts = name.split(".");

    if (parts.length < 2) {
      return "";
    }

    return parts.pop();
  }

  function getSourceTypeFromFile(file) {
    const extension = getExtension(file && file.name);

    return CONFIG.FILES.EXTENSION_TO_SOURCE[extension] || "";
  }

  function validateFile(file) {
    if (!file) {
      throw new Error("No se seleccionó ningún archivo.");
    }

    const extension = getExtension(file.name);

    if (!CONFIG.FILES.ACCEPTED_EXTENSIONS.includes(extension)) {
      throw new Error(`Formato no permitido: .${extension || "desconocido"}.`);
    }

    const maxBytes = CONFIG.FILES.MAX_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new Error(`El archivo supera el máximo permitido de ${CONFIG.FILES.MAX_SIZE_MB} MB.`);
    }

    return true;
  }

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo como texto."));
      reader.readAsText(file, "utf-8");
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo como ArrayBuffer."));
      reader.readAsArrayBuffer(file);
    });
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo como imagen."));
      reader.readAsDataURL(file);
    });
  }

  async function readFile(file) {
    validateFile(file);

    const sourceType = getSourceTypeFromFile(file);

    const payload = {
      name: file.name,
      size: file.size,
      extension: getExtension(file.name),
      sourceType,
      text: "",
      arrayBuffer: null,
      dataUrl: "",
      file
    };

    if (sourceType === CONFIG.SOURCE_TYPES.IMAGE) {
      payload.dataUrl = await readAsDataURL(file);
      return payload;
    }

    if (
      sourceType === CONFIG.SOURCE_TYPES.EXCEL ||
      sourceType === CONFIG.SOURCE_TYPES.PDF ||
      sourceType === CONFIG.SOURCE_TYPES.WORD
    ) {
      payload.arrayBuffer = await readAsArrayBuffer(file);
      return payload;
    }

    payload.text = await readAsText(file);
    return payload;
  }

  CM.FileService = {
    getExtension,
    getSourceTypeFromFile,
    validateFile,
    readAsText,
    readAsArrayBuffer,
    readAsDataURL,
    readFile
  };
})(window);