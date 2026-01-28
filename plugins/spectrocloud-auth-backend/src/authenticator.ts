import { createOAuthAuthenticator } from '@backstage/plugin-auth-node';

/**
 * Decodes a JWT token without verification.
 * SpectroCloud returns a signed JWT that we decode to extract user information.
 */
function decodeJWT(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format from SpectroCloud');
  }
  
  // Decode the payload (second part)
  const payload = parts[1];
  // Handle both base64 and base64url encoding
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(jsonPayload);
}

/**
 * Custom authenticator for SpectroCloud OIDC with proper token exchange.
 */
export const spectroCloudAuthenticator = createOAuthAuthenticator({
  defaultProfileTransform: async result => {
    // Decode the ID token to get user claims
    const idToken = result.session.idToken || result.session.accessToken;
    const claims = decodeJWT(idToken);

    // Build profile from JWT claims
    const displayName = claims.given_name && claims.family_name 
      ? `${claims.given_name} ${claims.family_name}`.trim()
      : claims.email || claims.sub;

    return {
      profile: {
        email: claims.email || claims.sub,
        displayName,
        picture: undefined,
      },
    };
  },
  
  scopes: {
    required: ['openid', 'profile', 'email'],
  },

  // Store configuration for use in authenticate method
  initialize({ callbackUrl, config }) {
    const clientId = config.getString('clientId');
    const clientSecret = config.getOptionalString('clientSecret');
    const authorizationUrl = config.getString('authorizationUrl');
    const scope = config.getOptionalString('scope') || 'openid profile email';
    
    // Derive token endpoint from authorization URL
    const tokenUrl = authorizationUrl.replace('/auth', '/token');

    return {
      clientId,
      clientSecret: clientSecret || '',
      callbackUrl,
      authorizationUrl,
      tokenUrl,
      scope,
    };
  },

  // Standard OAuth start - redirects to SpectroCloud
  async start(input, helpers) {
    const { state } = input;
    const { clientId, authorizationUrl, callbackUrl, scope } = helpers;

    const url = new URL(authorizationUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);
    
    // Generate a nonce for OIDC security
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    url.searchParams.set('nonce', nonce);

    return {
      url: url.toString(),
      status: 302,
    };
  },

  // Override the callback handler to do proper OIDC token exchange
  async authenticate({ req }, helpers) {
    const code = req.query.code as string;
    
    if (!code) {
      throw new Error('No code received from SpectroCloud');
    }

    // Get configuration from helpers (returned by initialize)
    const { clientId, clientSecret, tokenUrl, callbackUrl } = helpers;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        ...(clientSecret && { client_secret: clientSecret }),
        redirect_uri: callbackUrl,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, id_token, expires_in } = tokenData;

    if (!id_token) {
      throw new Error('No id_token received from SpectroCloud');
    }

    // Decode the ID token to get user info
    const claims = decodeJWT(id_token);
    
    // IMPORTANT: Use id_token for refresh since SpectroCloud's refresh_token
    // is not a proper OIDC token (it's an internal session token)
    const tokenToStore = id_token;

    return {
      fullProfile: {
        claims,
        userinfo: {
          sub: claims.sub || claims.email,
          email: claims.email,
          email_verified: !!claims.email,
          name: claims.given_name && claims.family_name
            ? `${claims.given_name} ${claims.family_name}`.trim()
            : claims.email || claims.sub,
          given_name: claims.given_name,
          family_name: claims.family_name,
          groups: claims.groups || [],
        },
      },
      session: {
        accessToken: access_token || id_token,
        idToken: id_token, // The actual OIDC ID token for Kubernetes
        refreshToken: tokenToStore, // Use id_token since refresh_token is wrong (HS256)
        tokenType: 'Bearer',
        scope: 'openid profile email',
        expiresInSeconds: expires_in || 3600,
        expiresAt: claims.exp || Math.floor(Date.now() / 1000) + (expires_in || 3600),
      },
    };
  },

  // SpectroCloud OIDC tokens are long-lived
  // Return the existing id_token since we stored it as the refresh token
  async refresh({ refreshToken }) {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Decode the JWT to check expiry
    const claims = decodeJWT(refreshToken);
    const now = Math.floor(Date.now() / 1000);
    
    // If token is expired, we can't refresh it - user needs to re-authenticate
    if (claims.exp && claims.exp < now) {
      throw new Error('Token has expired, please sign in again');
    }

    // Return the same id_token since SpectroCloud doesn't support actual token refresh
    const expiresInSeconds = claims.exp 
      ? claims.exp - now
      : 3600;

    return {
      fullProfile: {
        claims,
        userinfo: {
          sub: claims.sub || claims.email,
          email: claims.email,
          email_verified: !!claims.email,
          name: claims.given_name && claims.family_name
            ? `${claims.given_name} ${claims.family_name}`.trim()
            : claims.email || claims.sub,
          given_name: claims.given_name,
          family_name: claims.family_name,
          groups: claims.groups || [],
        },
      },
      session: {
        accessToken: refreshToken,
        idToken: refreshToken, // Use the same RS256 id_token for Kubernetes auth
        refreshToken: refreshToken, // Keep using id_token for next refresh
        tokenType: 'Bearer',
        scope: 'openid profile email',
        expiresInSeconds,
        expiresAt: claims.exp || now + 3600,
      },
    };
  },
});
