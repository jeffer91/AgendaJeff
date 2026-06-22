/*
  Nombre completo: cm-upload-panel.component.js
  Ruta: carga-masiva/js/componentes/cm-upload-panel.component.js

  Función:
    - Controlar el panel de subida de archivos.
    - Leer archivo seleccionado.
    - Mostrar nombre, tamaño y tipo.
    - Validar extensión y tamaño usando FileService.
    - Limpiar archivo seleccionado.
    - No procesa el contenido del archivo; solo maneja la parte visual y selección.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - servicios/cm-file.service.js
    - servicios/cm-parser.service.js
    - cm-app.js
    - cm-bindings.js
*/

(function initCmUploadPanelComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function getInput() {
    return CM.UI.byId(CONFIG.DOM_IDS.fileInput);
  }

  function getFile() {
    const input = getInput();

    if (!input || !input.files || !input.files.length) {
      return null;
    }

    return input.files[0];
  }

  function clear() {
    const input = getInput();

    if (input) {
      input.value = "";
    }

    CM.UI.setFileName(null);
  }

  function formatSize(bytes) {
    const size = Number(bytes || 0);

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getExtension(file) {
    if (CM.FileService && typeof CM.FileService.getExtension === "function") {
      return CM.FileService.getExtension(file ? file.name : "");
    }

    const name = file && file.name ? String(file.name).toLowerCase() : "";
    const parts = name.split(".");

    return parts.length > 1 ? parts.pop() : "";
  }

  function getSourceType(file) {
    if (CM.FileService && typeof CM.FileService.getSourceTypeFromFile === "function") {
      return CM.FileService.getSourceTypeFromFile(file);
    }

    const extension = getExtension(file);
    return CONFIG.FILES.EXTENSION_TO_SOURCE[extension] || "";
  }

  function validateSelectedFile() {
    const file = getFile();

    if (!file) {
      return {
        ok: false,
        file: null,
        message: "No hay archivo seleccionado."
      };
    }

    try {
      if (CM.FileService && typeof CM.FileService.validateFile === "function") {
        CM.FileService.validateFile(file);
      }

      return {
        ok: true,
        file,
        message: "Archivo válido."
      };
    } catch (error) {
      return {
        ok: false,
        file,
        message: error.message
      };
    }
  }

  function updateFileLabel() {
    const file = getFile();
    CM.UI.setFileName(file);

    if (!file) {
      return {
        ok: true,
        file: null,
        message: "Ningún archivo seleccionado."
      };
    }

    return validateSelectedFile();
  }

  function getInfo() {
    const file = getFile();

    if (!file) {
      return {
        hasFile: false,
        name: "",
        size: 0,
        sizeLabel: "",
        extension: "",
        sourceType: ""
      };
    }

    return {
      hasFile: true,
      name: file.name,
      size: file.size,
      sizeLabel: formatSize(file.size),
      extension: getExtension(file),
      sourceType: getSourceType(file)
    };
  }

  function showFileInfo() {
    const validation = validateSelectedFile();

    if (!validation.file) {
      CM.UI.toastWarning(validation.message);
      return validation;
    }

    if (!validation.ok) {
      CM.UI.toastError(validation.message);
      return validation;
    }

    const info = getInfo();
    CM.UI.toastInfo(`Archivo listo: ${info.name} (${info.sizeLabel}).`);

    return validation;
  }

  CM.Components.UploadPanel = {
    getInput,
    getFile,
    clear,
    formatSize,
    getExtension,
    getSourceType,
    validateSelectedFile,
    updateFileLabel,
    getInfo,
    showFileInfo
  };
})(window);