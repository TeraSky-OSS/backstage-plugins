import { createOAuthAuthenticator } from '@backstage/plugin-auth-node';
import { storeSessionToken } from './tokenCache';

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

    // CRITICAL: The authorization code itself IS the HS256 session token!
    // SpectroCloud uses the session token as the authorization code
    let sessionToken: string | undefined;
    
    // Check if the code is an HS256 JWT
    try {
      const codeHeaderB64 = code.split('.')[0];
      const codeHeader = JSON.parse(Buffer.from(codeHeaderB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      
      if (codeHeader.alg === 'HS256') {
        sessionToken = code; // Use the code directly as the session token
      }
    } catch (e) {
      // Not a JWT, continue
    }
    
    // Also check cookies and other locations as fallback
    if (!sessionToken) {
      sessionToken = req.query.Authorization as string 
        || req.query.authorization as string
        || req.query.token as string
        || req.query.session_token as string
        || req.query.auth_token as string
        || req.cookies?.Authorization
        || req.headers.authorization;
      
      // Check for token in cookies
      if (req.cookies) {
        Object.keys(req.cookies).forEach(key => {
          // Check if any cookie looks like a JWT
          if (req.cookies[key]?.startsWith('eyJ')) {
            try {
              const headerB64 = req.cookies[key].split('.')[0];
              const header = JSON.parse(Buffer.from(headerB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
              if (header.alg === 'HS256' && !sessionToken) {
                sessionToken = req.cookies[key];
              }
            } catch (e) {
              // Not a valid JWT
            }
          }
        });
      }
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
    const { id_token, expires_in, refresh_token } = tokenData;

    if (!id_token) {
      throw new Error('No id_token received from SpectroCloud');
    }
    
    // Check if refresh_token contains the HS256 session token
    if (refresh_token) {
      try {
        const refreshHeader = JSON.parse(Buffer.from(refresh_token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        
        // CRITICAL: Spectro Cloud returns the HS256 session token as refresh_token!
        if (refreshHeader.alg === 'HS256') {
          sessionToken = refresh_token;
        }
      } catch (e) {
        // Not a JWT, continue
      }
    }

    // Decode the ID token to get user info
    const claims = decodeJWT(id_token);

    // Store the HS256 token in server-side cache keyed by user email
    if (sessionToken) {
      // This allows the backend to use the correct API token for each user
      const userEmail = claims.email || claims.sub;
      const expiresAt = claims.exp || (Math.floor(Date.now() / 1000) + (expires_in || 3600));
      storeSessionToken(userEmail, sessionToken, expiresAt);
      console.log(`[SpectroCloud Auth] Cached HS256 token for user: ${userEmail}`);
    } else {
      console.warn('[SpectroCloud Auth] No HS256 token found - user will need to use fallback API token');
    }

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
        // Store the HS256 session token as BOTH accessToken and idToken
        accessToken: sessionToken || id_token,  // HS256 session token (or RS256 fallback)
        idToken: sessionToken || id_token, // HS256 session token (or RS256 fallback)
        refreshToken: id_token, // RS256 - Backstage can use this for validation
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
