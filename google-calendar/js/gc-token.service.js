/*
  Nombre completo: gc-token.service.js
  Ruta: google-calendar/js/gc-token.service.js
  Función:
    - Maneja el access token de Google Calendar.
    - Pide autorización usando Google Identity Services.
    - Reutiliza el token mientras siga vigente.
    - Revoca y limpia el token cuando se borra la conexión.
*/

(function initGcTokenService(global) {
  "use strict";

  const GC = global.GC = global.GC || {};
  const CONFIG = GC.CONFIG;

  function createEmptyTokenState() {
    return {
      accessToken: "",
      expiresIn: null,
      scope: "",
      tokenType: "",
      issuedAt: ""
    };
  }

  let tokenState = createEmptyTokenState();

  function getTokenState() {
    return {
      accessToken: tokenState.accessToken,
      expiresIn: tokenState.expiresIn,
      scope: tokenState.scope,
      tokenType: tokenState.tokenType,
      issuedAt: tokenState.issuedAt
    };
  }

  function hasValidToken() {
    if (!tokenState.accessToken) {
      return false;
    }

    const issuedAtMs = Date.parse(tokenState.issuedAt);
    const expiresInSeconds = Number(tokenState.expiresIn);

    if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresInSeconds)) {
      return true;
    }

    const safetyWindowMs = 60 * 1000;
    const expiresAtMs = issuedAtMs + expiresInSeconds * 1000;

    return Date.now() < expiresAtMs - safetyWindowMs;
  }

  async function requestToken(connection, prompt) {
    const safeConnection = connection || {};

    if (!safeConnection.clientId) {
      throw new Error("Falta el Google OAuth Client ID activo para pedir autorización.");
    }

    const tokenResponse = await GC.GoogleApi.requestAccessToken({
      clientId: safeConnection.clientId,
      scope: CONFIG.GOOGLE_AUTH_SCOPES,
      prompt
    });

    tokenState = {
      accessToken: tokenResponse.accessToken,
      expiresIn: tokenResponse.expiresIn,
      scope: tokenResponse.scope,
      tokenType: tokenResponse.tokenType,
      issuedAt: tokenResponse.issuedAt
    };

    return getTokenState();
  }

  async function ensureToken(connection) {
    if (hasValidToken()) {
      return getTokenState();
    }

    return requestToken(connection, "consent");
  }

  function clearToken() {
    if (tokenState.accessToken) {
      try {
        GC.GoogleApi.revokeAccessToken(tokenState.accessToken);
      } catch (error) {
        console.warn("No se pudo revocar el token de Google:", error);
      }
    }

    tokenState = createEmptyTokenState();

    return getTokenState();
  }

  GC.TokenService = {
    getTokenState,
    hasValidToken,
    requestToken,
    ensureToken,
    clearToken
  };
})(window);