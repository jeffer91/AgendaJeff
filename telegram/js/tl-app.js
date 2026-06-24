/*
  Nombre completo: tl-app.js
  Ruta: telegram/js/tl-app.js

  Función:
    - Controlador principal de la pantalla Telegram.
    - Conecta formularios, almacenamiento local, API de Telegram y Firebase.
    - Permite guardar conexión y probar conexión.
    - No permite crear ni enviar eventos desde esta pantalla.

  Regla funcional:
    - Los eventos se crean solo desde Agendador o Carga Masiva.
    - Telegram solo funciona como canal de notificación.
*/

(function initTlApp(global) {
  "use strict";

  const TL = global.TL;

  const elements = {
    statusBadge: document.getElementById("tlStatusBadge"),
    output: document.getElementById("tlOutput"),

    connectionForm: document.getElementById("tlConnectionForm"),
    botToken: document.getElementById("tlBotToken"),
    chatId: document.getElementById("tlChatId"),
    testConnectionBtn: document.getElementById("tlTestConnectionBtn"),
    clearConnectionBtn: document.getElementById("tlClearConnectionBtn"),

    eventForm: document.getElementById("tlEventForm")
  };

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function setStatus(type, text) {
    if (!elements.statusBadge) {
      return;
    }

    elements.statusBadge.className = `tl-status tl-status--${type}`;
    elements.statusBadge.textContent = text;
  }

  function setOutput(data) {
    if (!elements.output) {
      return;
    }

    if (typeof data === "string") {
      elements.output.textContent = data;
      return;
    }

    elements.output.textContent = JSON.stringify(data, null, 2);
  }

  function setBusy(isBusy) {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((button) => {
      button.disabled = isBusy;
    });
  }

  function readConnectionFromInputs() {
    return {
      botToken: elements.botToken ? elements.botToken.value : "",
      chatId: elements.chatId ? elements.chatId.value : ""
    };
  }

  async function loadSavedConnection() {
    const connection = TL.Storage.readConnection();

    if (elements.botToken) {
      elements.botToken.value = connection.botToken || "";
    }

    if (elements.chatId) {
      elements.chatId.value = connection.chatId || "";
    }

    try {
      await TL.FirebaseService.checkFirebaseConnection();
    } catch (error) {
      setStatus("error", "Firebase error");
      setOutput({
        ok: false,
        message: "Telegram puede funcionar, pero Firebase no inicializó.",
        error: error.message
      });
      return;
    }

    if (connection.botToken && connection.chatId) {
      try {
        const firebaseStatus = await TL.FirebaseService.readTelegramConnectionStatus();

        setStatus("idle", "Guardado local");
        setOutput({
          ok: true,
          message: "Conexión cargada desde localStorage.",
          local: {
            botTokenSaved: true,
            chatId: connection.chatId,
            savedAt: connection.savedAt || null
          },
          firebase: firebaseStatus,
          note: "Telegram queda como canal de notificación. Los eventos se crean desde Agendador o Carga Masiva."
        });
      } catch (error) {
        setStatus("idle", "Guardado local");
        setOutput({
          ok: true,
          message: "Conexión cargada localmente, pero no se pudo leer Firebase.",
          local: {
            botTokenSaved: true,
            chatId: connection.chatId,
            savedAt: connection.savedAt || null
          },
          firebaseError: error.message
        });
      }

      return;
    }

    setStatus("idle", "Sin probar");
    setOutput({
      ok: true,
      message: "Esperando acción.",
      firebasePath: "conexiones/telegram"
    });
  }

  async function saveConnection(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    setBusy(true);
    setStatus("loading", "Guardando");

    try {
      const connection = TL.Storage.saveConnection(readConnectionFromInputs());

      const firebasePayload = await TL.FirebaseService.saveTelegramSavedConnectionStatus({
        botToken: connection.botToken,
        chatId: connection.chatId,
        savedAt: connection.savedAt
      });

      setStatus("idle", "Guardado");

      setOutput({
        ok: true,
        message: "Conexión guardada en localStorage y Cloud Firestore.",
        firestorePath: "conexiones/telegram",
        savedAt: connection.savedAt,
        local: {
          botTokenSaved: true,
          chatId: connection.chatId
        },
        firebase: firebasePayload,
        note: "Telegram solo enviará mensajes generados desde Agendador, Carga Masiva o el motor de recordatorios."
      });
    } catch (error) {
      setStatus("error", "Error");
      setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setStatus("loading", "Probando");

    let connection = {
      botToken: "",
      chatId: ""
    };

    try {
      connection = TL.Storage.saveConnection(readConnectionFromInputs());

      const botInfo = await TL.TelegramApi.getMe(connection.botToken);

      const message = [
        "✅ <b>AgendaJeff conectado con Telegram</b>",
        "",
        "La conexión básica funciona correctamente.",
        "No se creó ningún evento desde la pantalla Telegram.",
        `Bot: @${botInfo.username || "sin_username"}`,
        `Fecha de prueba: ${new Date().toLocaleString()}`
      ].join("\n");

      const sentMessage = await TL.TelegramApi.sendMessage({
        botToken: connection.botToken,
        chatId: connection.chatId,
        text: message
      });

      const firebasePayload = await TL.FirebaseService.saveTelegramConnectedStatus({
        botUsername: botInfo.username || "",
        chatId: connection.chatId,
        messageId: sentMessage.message_id
      });

      setStatus("ok", "Conectado");

      setOutput({
        ok: true,
        message: "Telegram funciona correctamente y Firebase fue actualizado. No se creó ningún evento.",
        firestorePath: "conexiones/telegram",
        bot: {
          id: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name
        },
        telegram: {
          sentMessageId: sentMessage.message_id
        },
        firebase: firebasePayload,
        rule: "Los eventos solo se crean desde Agendador o Carga Masiva."
      });
    } catch (error) {
      try {
        await TL.FirebaseService.saveTelegramErrorStatus({
          message: error.message,
          chatId: connection.chatId || normalizeText(elements.chatId && elements.chatId.value)
        });
      } catch (firebaseError) {
        setStatus("error", "Error");
        setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message,
          help: "Telegram falló y además Firebase no pudo guardar el error."
        });
        return;
      }

      setStatus("error", "Error");
      setOutput({
        ok: false,
        message: error.message,
        firestorePath: "conexiones/telegram",
        help: "Revisa que el Bot Token sea correcto, que el Chat ID sea correcto y que hayas iniciado conversación con el bot."
      });
    } finally {
      setBusy(false);
    }
  }

  async function clearConnection() {
    setBusy(true);
    setStatus("loading", "Borrando");

    try {
      TL.Storage.clearConnection();

      if (elements.botToken) {
        elements.botToken.value = "";
      }

      if (elements.chatId) {
        elements.chatId.value = "";
      }

      const firebasePayload = await TL.FirebaseService.saveTelegramDisconnectedStatus();

      setStatus("idle", "Desconectado");

      setOutput({
        ok: true,
        message: "Datos de Telegram borrados del navegador y Firebase actualizado.",
        firestorePath: "conexiones/telegram",
        firebase: firebasePayload
      });
    } catch (error) {
      setStatus("error", "Error");
      setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function blockEventCreationFromModule(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    setStatus("error", "Bloqueado");
    setOutput({
      ok: false,
      blocked: true,
      message: "La creación o envío de eventos desde Telegram está bloqueada.",
      rule: "Crea eventos únicamente desde Agendador o Carga Masiva."
    });
  }

  function bindEvents() {
    if (elements.connectionForm) {
      elements.connectionForm.addEventListener("submit", saveConnection);
    }

    if (elements.testConnectionBtn) {
      elements.testConnectionBtn.addEventListener("click", testConnection);
    }

    if (elements.clearConnectionBtn) {
      elements.clearConnectionBtn.addEventListener("click", clearConnection);
    }

    if (elements.eventForm) {
      elements.eventForm.addEventListener("submit", blockEventCreationFromModule);
    }
  }

  function init() {
    bindEvents();
    loadSavedConnection();
  }

  TL.App = {
    init,
    loadSavedConnection,
    saveConnection,
    testConnection,
    clearConnection,
    blockEventCreationFromModule,
    sendTestEvent: blockEventCreationFromModule
  };

  init();
})(window);
