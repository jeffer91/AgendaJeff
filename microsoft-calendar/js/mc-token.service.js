/*
  Nombre completo: mc-token.service.js
  Ruta: microsoft-calendar/js/mc-token.service.js
  Función:
    - Manejar conexión OAuth con Microsoft usando MSAL Browser.
    - Conectar cuenta Microsoft 1 y cuenta Microsoft 2 por separado.
    - Obtener access token solo en memoria para llamar Microsoft Graph.
    - NO guardar tokens en Firebase.
    - NO guardar tokens en localStorage.
  Se conecta con:
    - mc-config.js
    - mc-storage.js
    - mc-microsoft-api.js
    - mc-connection.actions.js
    - mc-calendar.actions.js
*/

(function initMcTokenService(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const Utils = MC.Utils;

  let msalClient = null;
  let msalClientKey = "";
  let msalInitialized = false;

  const tokenState = {
    account1: null,
    account2: null
  };

  function assertMsalSdk() {
    if (!global.msal || !global.msal.PublicClientApplication) {
      throw new Error("MSAL no está cargado. Revisa el script de Microsoft en mc-index.html.");
    }
  }

  function createMsalClientKey(appConfig) {
    const app = Utils.normalizeAppConfig(appConfig);

    return [
      app.clientId,
      app.tenantMode,
      app.tenantId,
      app.activeRedirectType,
      Utils.getActiveRedirectUri(app)
    ].join("|");
  }

  function createMsalConfig(appConfig) {
    const app = Utils.normalizeAppConfig(appConfig);
    const redirectUri = Utils.getActiveRedirectUri(app);

    if (!app.clientId) {
      throw new Error("Falta el Client ID de Microsoft.");
    }

    if (!redirectUri) {
      throw new Error("Falta el Redirect URI de Microsoft.");
    }

    return {
      auth: {
        clientId: app.clientId,
        authority: Utils.getAuthorityFromAppConfig(app),
        redirectUri,
        navigateToLoginRequestUrl: false
      },
      cache: {
        cacheLocation: "memoryStorage",
        storeAuthStateInCookie: false
      },
      system: {
        allowNativeBroker: false
      }
    };
  }

  async function getMsalClient(appConfig) {
    assertMsalSdk();

    const key = createMsalClientKey(appConfig);

    if (msalClient && msalClientKey === key) {
      return msalClient;
    }

    msalClient = new global.msal.PublicClientApplication(
      createMsalConfig(appConfig)
    );

    msalClientKey = key;
    msalInitialized = false;

    if (typeof msalClient.initialize === "function") {
      await msalClient.initialize();
      msalInitialized = true;
    }

    return msalClient;
  }

  async function ensureMsalInitialized(client) {
    if (!client || msalInitialized) {
      return;
    }

    if (typeof client.initialize === "function") {
      await client.initialize();
    }

    msalInitialized = true;
  }

  function getScopes(connection) {
    const safeConnection = Utils.normalizeConnection(connection);
    return Utils.normalizeScopes(safeConnection.app.scopes);
  }

  function getLoginHint(account) {
    const safeAccount = account || {};
    return Utils.cleanString(
      safeAccount.accountEmail ||
      safeAccount.microsoftUsername ||
      ""
    );
  }

  function createTokenRequest(connection, accountSlot, options) {
    const safeConnection = Utils.normalizeConnection(connection);
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const account = safeConnection.accounts[slot];
    const safeOptions = options || {};

    const request = {
      scopes: getScopes(safeConnection)
    };

    const loginHint = getLoginHint(account);

    if (loginHint) {
      request.loginHint = loginHint;
    }

    if (safeOptions.prompt) {
      request.prompt = safeOptions.prompt;
    }

    if (safeOptions.account) {
      request.account = safeOptions.account;
    }

    return request;
  }

  function normalizeAuthResult(authResult) {
    const result = authResult || {};
    const account = result.account || {};
    const expiresOn = result.expiresOn instanceof Date
      ? result.expiresOn.toISOString()
      : "";

    return {
      accessToken: Utils.cleanString(result.accessToken),
      idToken: "",
      scope: Utils.cleanString(result.scopes ? result.scopes.join(" ") : result.scope),
      expiresOn,
      issuedAt: Utils.nowIso(),
      account: {
        homeAccountId: Utils.cleanString(account.homeAccountId),
        localAccountId: Utils.cleanString(account.localAccountId),
        username: Utils.cleanString(account.username),
        name: Utils.cleanString(account.name),
        tenantId: Utils.cleanString(account.tenantId)
      }
    };
  }

  function isTokenValid(tokenInfo) {
    if (!tokenInfo || !tokenInfo.accessToken || !tokenInfo.expiresOn) {
      return false;
    }

    const expiresAt = new Date(tokenInfo.expiresOn).getTime();

    if (!Number.isFinite(expiresAt)) {
      return false;
    }

    return expiresAt > Date.now() + 60000;
  }

  function hasValidToken(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    return isTokenValid(tokenState[slot]);
  }

  function getTokenInfo(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    return tokenState[slot];
  }

  function getPublicTokenInfo(accountSlot) {
    const tokenInfo = getTokenInfo(accountSlot);

    if (!tokenInfo) {
      return {
        hasToken: false
      };
    }

    return {
      hasToken: Boolean(tokenInfo.accessToken),
      valid: isTokenValid(tokenInfo),
      scope: tokenInfo.scope,
      issuedAt: tokenInfo.issuedAt,
      expiresOn: tokenInfo.expiresOn,
      account: tokenInfo.account
    };
  }

  async function connectAccount(accountSlot, connection) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safeConnection = Utils.normalizeConnection(connection);
    const client = await getMsalClient(safeConnection.app);

    await ensureMsalInitialized(client);

    const request = createTokenRequest(safeConnection, slot, {
      prompt: "select_account"
    });

    const authResult = await client.acquireTokenPopup(request);
    const tokenInfo = normalizeAuthResult(authResult);

    if (!tokenInfo.accessToken) {
      throw new Error("Microsoft no devolvió access token. Revisa permisos y consentimiento.");
    }

    tokenState[slot] = tokenInfo;

    return tokenInfo;
  }

  async function acquireTokenSilent(accountSlot, connection) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safeConnection = Utils.normalizeConnection(connection);
    const currentToken = tokenState[slot];

    if (!currentToken || !currentToken.account || !currentToken.account.homeAccountId) {
      throw new Error("No hay cuenta Microsoft activa en memoria.");
    }

    const client = await getMsalClient(safeConnection.app);

    await ensureMsalInitialized(client);

    const accounts = typeof client.getAllAccounts === "function"
      ? client.getAllAccounts()
      : [];

    const msalAccount = accounts.find((account) => {
      return account.homeAccountId === currentToken.account.homeAccountId ||
        account.username === currentToken.account.username;
    });

    if (!msalAccount) {
      throw new Error("La cuenta Microsoft ya no está disponible en memoria.");
    }

    const request = createTokenRequest(safeConnection, slot, {
      account: msalAccount
    });

    const authResult = await client.acquireTokenSilent(request);
    const tokenInfo = normalizeAuthResult(authResult);

    if (!tokenInfo.accessToken) {
      throw new Error("No se pudo renovar el access token de Microsoft.");
    }

    tokenState[slot] = tokenInfo;

    return tokenInfo;
  }

  async function ensureToken(accountSlot, connection) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    if (hasValidToken(slot)) {
      return tokenState[slot];
    }

    try {
      return await acquireTokenSilent(slot, connection);
    } catch (silentError) {
      return connectAccount(slot, connection);
    }
  }

  function clearAccountToken(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    tokenState[slot] = null;

    return {
      ok: true,
      accountSlot: slot,
      cleared: true
    };
  }

  function clearAllTokens() {
    tokenState.account1 = null;
    tokenState.account2 = null;

    return {
      ok: true,
      cleared: true
    };
  }

  MC.TokenService = {
    getMsalClient,
    connectAccount,
    acquireTokenSilent,
    ensureToken,

    hasValidToken,
    getTokenInfo,
    getPublicTokenInfo,

    clearAccountToken,
    clearAllTokens
  };
})(window);