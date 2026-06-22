/*
  Nombre completo: mc-connection.actions.js
  Ruta: microsoft-calendar/js/mc-connection.actions.js
  Función:
    - Manejar acciones de configuración y conexión de Microsoft Calendar.
    - Guardar configuración local y en Firebase.
    - Cargar configuración guardada.
    - Conectar cuenta Microsoft 1 y cuenta Microsoft 2 por separado.
    - Borrar datos locales, tokens en memoria y documento Firebase.
  Se conecta con:
    - mc-config.js
    - mc-storage.js
    - mc-microsoft-api.js
    - mc-firebase.service.js
    - mc-ui.js
    - mc-token.service.js
    - mc-bindings.js

  Importante:
    - NO guarda access_token en Firebase.
    - NO guarda refresh_token en Firebase.
    - NO guarda id_token en Firebase.
    - NO guarda authorization_code en Firebase.
*/

(function initMcConnectionActions(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const CONFIG = MC.CONFIG;
  const Utils = MC.Utils;

  function createConnectionDraft() {
    if (MC.UI && typeof MC.UI.readConnectionFromInputs === "function") {
      return Utils.normalizeConnection(MC.UI.readConnectionFromInputs());
    }

    return MC.Storage.readConnection();
  }

  function validateAppConfig(connection) {
    const safeConnection = Utils.normalizeConnection(connection);
    const app = safeConnection.app;

    if (!app.clientId) {
      throw new Error("Falta el Microsoft Application / Client ID.");
    }

    if (!Utils.getActiveRedirectUri(app)) {
      throw new Error("Falta el Redirect URI activo de Microsoft.");
    }

    if (app.tenantMode === CONFIG.TENANT_MODES.TENANT && !app.tenantId) {
      throw new Error("Seleccionaste tenantId específico, pero falta escribir el Tenant ID.");
    }

    return true;
  }

  function validateAccountForConnection(connection, accountSlot) {
    const safeConnection = Utils.normalizeConnection(connection);
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const account = safeConnection.accounts[slot];

    if (!account.accountEmail) {
      throw new Error(`Falta el correo de ${Utils.getAccountLabel(slot)}.`);
    }

    return true;
  }

  async function saveConnectionToFirebase(connection) {
    return MC.FirebaseService.saveMicrosoftCalendarSavedConnectionStatus(connection);
  }

  async function loadSavedConnection() {
    const localConnection = MC.Storage.readConnection();

    try {
      const firebaseStatus =
        await MC.FirebaseService.readMicrosoftCalendarConnectionStatus();

      if (!localConnection.configured && firebaseStatus.exists && firebaseStatus.data) {
        const remoteConnection = Utils.normalizeConnection(firebaseStatus.data);
        const savedRemoteConnection = MC.Storage.saveConnection(remoteConnection);

        MC.UI.showConnectionLoaded(savedRemoteConnection, firebaseStatus);
        return savedRemoteConnection;
      }

      MC.UI.showConnectionLoaded(localConnection, firebaseStatus);
      return localConnection;
    } catch (error) {
      MC.UI.writeConnectionToInputs(localConnection);

      if (localConnection.configured) {
        MC.UI.setStatus("idle", "Guardado local");
      } else {
        MC.UI.setStatus("error", "Firebase error");
      }

      MC.UI.setOutput({
        ok: false,
        message: "No se pudo leer Firebase, pero la app puede seguir usando datos locales.",
        firestorePath: CONFIG.FIRESTORE_PATH,
        local: {
          configured: localConnection.configured,
          clientIdSaved: Boolean(localConnection.app.clientId),
          account1Email: localConnection.accounts.account1.accountEmail,
          account2Email: localConnection.accounts.account2.accountEmail
        },
        firebaseError: error.message
      });

      return localConnection;
    }
  }

  async function saveConnection(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    MC.UI.setBusy(true);
    MC.UI.setStatus("loading", "Guardando");

    try {
      const connection = MC.Storage.saveConnection(
        MC.UI.readConnectionFromInputs()
      );

      const firebasePayload = await saveConnectionToFirebase(connection);

      MC.UI.writeConnectionToInputs(connection);
      MC.UI.setStatus("idle", "Guardado");

      MC.UI.setOutput({
        ok: true,
        message: "Configuración Microsoft Calendar guardada en localStorage y Firebase.",
        firestorePath: CONFIG.FIRESTORE_PATH,
        local: {
          configured: connection.configured,
          clientIdSaved: Boolean(connection.app.clientId),
          tenantMode: connection.app.tenantMode,
          activeRedirectType: connection.app.activeRedirectType,
          redirectUriActive: Utils.getActiveRedirectUri(connection.app),
          account1Email: connection.accounts.account1.accountEmail,
          account2Email: connection.accounts.account2.accountEmail
        },
        firebase: firebasePayload,
        note: "Solo se guardó configuración y estado. No se guardaron tokens."
      });

      return connection;
    } catch (error) {
      MC.UI.setStatus("error", "Error");

      MC.UI.setOutput({
        ok: false,
        message: error.message,
        firestorePath: CONFIG.FIRESTORE_PATH
      });

      throw error;
    } finally {
      MC.UI.setBusy(false);
    }
  }

  async function connectAccount(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    MC.UI.setBusy(true);
    MC.UI.setStatus("loading", "Conectando");
    MC.UI.setAccountStatus(slot, "loading", "Conectando");

    let connection = createConnectionDraft();

    try {
      connection = MC.Storage.saveConnection(connection);

      validateAppConfig(connection);
      validateAccountForConnection(connection, slot);

      await saveConnectionToFirebase(connection);

      const tokenInfo = await MC.TokenService.connectAccount(slot, connection);
      const profile = await MC.MicrosoftApi.getMe(tokenInfo.accessToken);

      const inputAccount = connection.accounts[slot];

      const updatedConnection = MC.Storage.markAccountConnected(slot, {
        accountEmail: profile.email || inputAccount.accountEmail,
        microsoftAccountId: profile.id || tokenInfo.account.homeAccountId,
        microsoftUsername: profile.userPrincipalName || tokenInfo.account.username
      });

      const updatedAccount = updatedConnection.accounts[slot];

      const firebasePayload =
        await MC.FirebaseService.saveMicrosoftCalendarConnectedStatus({
          accountSlot: slot,
          account: updatedAccount
        });

      MC.UI.writeConnectionToInputs(updatedConnection);
      MC.UI.setStatus("ok", "Conectado");
      MC.UI.setAccountStatus(slot, "ok", "Conectada");

      MC.UI.setOutput({
        ok: true,
        message: `${Utils.getAccountLabel(slot)} conectada correctamente con Microsoft.`,
        firestorePath: CONFIG.FIRESTORE_PATH,
        accountSlot: slot,
        account: {
          label: updatedAccount.label,
          accountEmail: updatedAccount.accountEmail,
          microsoftAccountId: updatedAccount.microsoftAccountId,
          microsoftUsername: updatedAccount.microsoftUsername,
          connected: updatedAccount.connected,
          lastConnectedAt: updatedAccount.lastConnectedAt
        },
        microsoftProfile: profile,
        token: MC.TokenService.getPublicTokenInfo(slot),
        firebase: firebasePayload,
        note: "El access token existe solo en memoria mientras esta pantalla está abierta."
      });

      return updatedConnection;
    } catch (error) {
      try {
        MC.Storage.saveAccountError(slot, error);

        await MC.FirebaseService.saveMicrosoftCalendarErrorStatus({
          accountSlot: slot,
          error
        });
      } catch (firebaseError) {
        MC.UI.setStatus("error", "Error");
        MC.UI.setAccountStatus(slot, "error", "Error");

        MC.UI.setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message,
          firestorePath: CONFIG.FIRESTORE_PATH
        });

        throw error;
      }

      MC.UI.setStatus("error", "Error");
      MC.UI.setAccountStatus(slot, "error", "Error");

      MC.UI.setOutput({
        ok: false,
        message: error.message,
        accountSlot: slot,
        firestorePath: CONFIG.FIRESTORE_PATH
      });

      throw error;
    } finally {
      MC.UI.setBusy(false);
    }
  }

  async function connectAccount1() {
    return connectAccount("account1");
  }

  async function connectAccount2() {
    return connectAccount("account2");
  }

  async function clearConnection() {
    const shouldClear = global.confirm
      ? global.confirm("¿Seguro que quieres borrar los datos de Microsoft Calendar?")
      : true;

    if (!shouldClear) {
      MC.UI.setOutput({
        ok: true,
        message: "Borrado cancelado. No se modificó nada."
      });

      return;
    }

    MC.UI.setBusy(true);
    MC.UI.setStatus("loading", "Borrando");

    try {
      MC.TokenService.clearAllTokens();

      const emptyConnection = MC.Storage.clearConnection();

      let firebasePayload = null;

      try {
        firebasePayload = await MC.FirebaseService.clearMicrosoftCalendarStatus();
      } catch (firebaseError) {
        MC.UI.writeConnectionToInputs(emptyConnection);
        MC.UI.setStatus("idle", "Borrado local");
        MC.UI.setAccountStatus("account1", "idle", "Sin conectar");
        MC.UI.setAccountStatus("account2", "idle", "Sin conectar");

        MC.UI.setOutput({
          ok: true,
          message: "Se borraron los datos locales, pero no se pudo borrar Firebase.",
          firestorePath: CONFIG.FIRESTORE_PATH,
          firebaseError: firebaseError.message
        });

        return;
      }

      MC.UI.writeConnectionToInputs(emptyConnection);
      MC.UI.setStatus("idle", "Sin probar");
      MC.UI.setAccountStatus("account1", "idle", "Sin conectar");
      MC.UI.setAccountStatus("account2", "idle", "Sin conectar");

      MC.UI.setOutput({
        ok: true,
        message: "Datos de Microsoft Calendar borrados correctamente.",
        firestorePath: CONFIG.FIRESTORE_PATH,
        localCleared: true,
        memoryTokensCleared: true,
        firebase: firebasePayload
      });
    } catch (error) {
      MC.UI.setStatus("error", "Error");

      MC.UI.setOutput({
        ok: false,
        message: error.message,
        firestorePath: CONFIG.FIRESTORE_PATH
      });
    } finally {
      MC.UI.setBusy(false);
    }
  }

  MC.ConnectionActions = {
    createConnectionDraft,
    validateAppConfig,
    validateAccountForConnection,

    saveConnectionToFirebase,
    loadSavedConnection,
    saveConnection,

    connectAccount,
    connectAccount1,
    connectAccount2,

    clearConnection
  };
})(window);