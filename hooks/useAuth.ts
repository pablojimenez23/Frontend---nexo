import { useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { COGNITO_CONFIG } from '@/config/cognito';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: `${COGNITO_CONFIG.domain}/oauth2/authorize`,
  tokenEndpoint: `${COGNITO_CONFIG.domain}/oauth2/token`,
};

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'nexo',
});

export function useAuth() {
  const [cargando, setCargando] = useState(false);

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: COGNITO_CONFIG.clientId,
      redirectUri: redirectUri,
      scopes: COGNITO_CONFIG.scopes,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  const iniciarSesion = useCallback(async () => {
    if (!request) return;
    setCargando(true);
    console.log('redirectUri usado:', redirectUri);

    try {
      const result = await promptAsync();
      console.log('Resultado de promptAsync:', JSON.stringify(result));

      if (result.type === 'success' && result.params.code) {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: COGNITO_CONFIG.clientId,
            code: result.params.code,
            redirectUri: redirectUri,
            extraParams: { code_verifier: request.codeVerifier ?? '' },
          },
          discovery
        );

        await SecureStore.setItemAsync('access_token', tokenResponse.accessToken);
        if (tokenResponse.refreshToken) {
          await SecureStore.setItemAsync('refresh_token', tokenResponse.refreshToken);
        }

        return tokenResponse.accessToken;
      } else {
        console.log('Login no exitoso, tipo:', result.type);
      }
    } catch (error) {
      console.log('ERROR en login:', error);
    } finally {
      setCargando(false);
    }
  }, [request, promptAsync]);

  return { iniciarSesion, cargando, listo: !!request };
}