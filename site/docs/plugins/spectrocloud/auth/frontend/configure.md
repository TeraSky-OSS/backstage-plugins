# Configuring the SpectroCloud Authentication Frontend Plugin

The frontend plugin is largely auto-configured, but offers several customization options through the sign-in page and programmatic usage.

## Sign-In Page Configuration

### Global Sign-In Page Module

The recommended approach for configuring the sign-in page:

```yaml
# app-config.yaml
signinPage:
  providers:
    spectrocloud:
      enabled: true
      title: SpectroCloud
      message: Sign in using SpectroCloud
```

### Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable SpectroCloud provider |
| `title` | string | `SpectroCloud` | Display title on sign-in button |
| `message` | string | `Sign in using SpectroCloud` | Message below button |

### Configuration Examples

#### Minimal Configuration
```yaml
signinPage:
  providers:
    spectrocloud:
      enabled: true
```

#### Custom Branding
```yaml
signinPage:
  providers:
    spectrocloud:
      enabled: true
      title: "Employee Portal"
      message: "Sign in with your corporate account"
```

#### Environment-Specific
```yaml
# app-config.local.yaml (development)
signinPage:
  providers:
    spectrocloud:
      enabled: true
      title: "SpectroCloud Dev"
      message: "Development environment"

# app-config.production.yaml (production)
signinPage:
  providers:
    spectrocloud:
      enabled: true
      title: "SpectroCloud"
      message: "Sign in using your SpectroCloud account"
```

## Programmatic Usage

### Using the API Reference

The plugin exports `spectroCloudAuthApiRef` which can be used in any component:

```typescript
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

function MyComponent() {
  const authApi = useApi(spectroCloudAuthApiRef);
  
  // Use authApi methods
}
```

### Available API Methods

#### Authentication
```typescript
// Initiate sign-in
await authApi.signIn();

// Sign out
await authApi.signOut();
```

#### User Information
```typescript
// Get user profile
const profile = await authApi.getProfile();
// { email, displayName, picture }

// Get Backstage identity
const identity = await authApi.getBackstageIdentity();
// { type, userEntityRef, ownershipEntityRefs, token }
```

#### OIDC Token
```typescript
// Get ID token (for Kubernetes authentication)
const idToken = await authApi.getIdToken();
```

#### Session State
```typescript
import { useObservable } from 'react-use';

const sessionState = useObservable(authApi.sessionState$());
// 'SignedIn' or 'SignedOut'
```

## Custom Sign-In Page Implementation

If you're not using the global sign-in page module:

```typescript
import { SignInPage } from '@backstage/core-components';
import {
  spectroCloudAuthApiRef,
} from '@terasky/backstage-plugin-spectrocloud-auth';

const App = () => (
  <SignInPage
    providers={[
      {
        id: 'spectrocloud-auth-provider',
        title: 'SpectroCloud',
        message: 'Sign in using SpectroCloud',
        apiRef: spectroCloudAuthApiRef,
      },
    ]}
  />
);
```

### Multiple Providers

```typescript
import {
  githubAuthApiRef,
  googleAuthApiRef,
} from '@backstage/core-plugin-api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

const providers = [
  {
    id: 'github-auth',
    title: 'GitHub',
    message: 'Sign in using GitHub',
    apiRef: githubAuthApiRef,
  },
  {
    id: 'google-auth',
    title: 'Google',
    message: 'Sign in using Google',
    apiRef: googleAuthApiRef,
  },
  {
    id: 'spectrocloud-auth',
    title: 'SpectroCloud',
    message: 'Sign in using SpectroCloud',
    apiRef: spectroCloudAuthApiRef,
  },
];
```

## Integration Examples

### Protected Route

```typescript
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

function ProtectedComponent() {
  const authApi = useApi(spectroCloudAuthApiRef);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    authApi.sessionState$().subscribe(state => {
      setIsAuthenticated(state === 'SignedIn');
    });
  }, [authApi]);

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return <div>Protected content</div>;
}
```

### API Call with Auth

```typescript
import { useApi, fetchApiRef } from '@backstage/core-plugin-api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

async function callAuthenticatedAPI() {
  const authApi = useApi(spectroCloudAuthApiRef);
  const fetchApi = useApi(fetchApiRef);
  
  const identity = await authApi.getBackstageIdentity();
  
  const response = await fetchApi.fetch('/api/my-endpoint', {
    headers: {
      'Authorization': `Bearer ${identity.token}`,
    },
  });
  
  return response.json();
}
```

## Troubleshooting

### Sign-In Not Working
1. Check backend module is installed and running
2. Verify configuration in `app-config.yaml`
3. Review browser console for errors
4. Check backend logs

### Session Expired
The plugin automatically handles token refresh. If issues persist:
1. Clear browser cookies
2. Sign out and sign in again
3. Check backend token expiration settings

### Popup Blocked
1. Allow popups for your Backstage domain
2. Check browser popup blocker
3. Try incognito/private browsing mode

### Cannot Get ID Token
1. Verify backend is performing proper OIDC token exchange
2. Check backend logs for token exchange response
3. Ensure SpectroCloud is returning `id_token`

## Best Practices

1. **Use Configuration** - Prefer YAML configuration over code
2. **Handle Errors** - Always catch and handle authentication errors
3. **Monitor State** - Subscribe to session state for reactive UIs
4. **Secure Tokens** - Never log or expose tokens
5. **Test Flows** - Test full authentication flow in all environments

## Related Configuration

See also:
- [Backend Module Configuration](../backend/configure.md)
- [Kubernetes Module Configuration](../kubernetes-module/configure.md)
