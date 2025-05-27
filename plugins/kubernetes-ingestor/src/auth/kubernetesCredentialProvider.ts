import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import {
  AksStrategy,
  AwsIamStrategy,
  AzureIdentityStrategy,
  GoogleServiceAccountStrategy,
  GoogleStrategy,
  OidcStrategy,
  ServiceAccountStrategy,
} from '@backstage/plugin-kubernetes-backend';
import { KubernetesCredential } from '@backstage/plugin-kubernetes-node';

export async function getAuthCredential(
  cluster: any,
  authProvider: string,
  config: Config,
  logger: LoggerService,
): Promise<KubernetesCredential> {
  // First, check if we have a custom auth strategy registered globally
  const globalAuthStrategies = (global as any).kubernetesAuthStrategies;
  if (globalAuthStrategies && globalAuthStrategies.has(authProvider)) {
    const strategy = globalAuthStrategies.get(authProvider);
    logger.debug(`Using registered custom auth strategy: ${authProvider}`);
    return await strategy.getCredential(cluster, {});
  }

  // Fallback to built-in auth providers
  switch (authProvider) {
    case 'aks': {
      const aksAuth = new AksStrategy();
      const authConfig = config.getConfig('auth');
      const authEnvironment = authConfig?.getOptionalString('environment');
      if (!authEnvironment) {
        throw new Error(
          'Missing environment configuration for AKS authentication',
        );
      }
      const aksAuthConfig = authConfig
        ?.getOptionalConfig('providers')
        ?.getOptionalConfig('aks')
        ?.getOptionalConfig(authEnvironment);
      if (!aksAuthConfig) {
        throw new Error(
          `Missing request authentication configuration for AKS in environment: ${authEnvironment}`,
        );
      }
      const requestAuth = {
        aks: {
          clientId: aksAuthConfig?.getOptionalString('clientId'),
          clientSecret: aksAuthConfig?.getOptionalString('clientSecret'),
          tenantId: aksAuthConfig?.getOptionalString('tenantId'),
          domainHint: aksAuthConfig?.getOptionalString('domainHint'),
        }
      };
      return await aksAuth.getCredential(cluster, requestAuth);
    }
    case 'aws': {
      if (!cluster.authMetadata?.['kubernetes.io/aws-assume-role']) {
        throw new Error('AWS role ARN not found in cluster auth metadata');
      }
      const awsAuth = new AwsIamStrategy({ config });
      return await awsAuth.getCredential(cluster);
    }
    case 'azure': {
      const azureAuth = new AzureIdentityStrategy(logger);
      return await azureAuth.getCredential();
    }
    case 'google': {
      const googleAuth = new GoogleStrategy();
      const authConfig = config.getConfig('auth');
      const authEnvironment = authConfig?.getOptionalString('environment');
      if (!authEnvironment) {
        throw new Error(
          'Missing environment configuration for Google authentication',
        );
      }
      const googleAuthConfig = authConfig
        ?.getOptionalConfig('providers')
        ?.getOptionalConfig('google')
        ?.getOptionalConfig(authEnvironment);
      if (!googleAuthConfig) {
        throw new Error(
          `Missing request authentication configuration for Google in environment: ${authEnvironment}`,
        );
      }
      const requestAuth = {
        google: {
          clientId: googleAuthConfig?.getOptionalString('clientId'),
          clientSecret: googleAuthConfig?.getOptionalString('clientSecret'),
        }
      };
      return await googleAuth.getCredential(cluster, requestAuth);
    }
    case 'googleServiceAccount': {
      const googleServiceAccountAuth = new GoogleServiceAccountStrategy();
      return await googleServiceAccountAuth.getCredential();
    }
    case 'oidc': {
      const oidcAuth = new OidcStrategy();
      const authConfig = config.getConfig('auth');
      const authEnvironment = authConfig?.getOptionalConfig('providers')?.getOptionalString('environment');
      if (!authEnvironment) {
        throw new Error(
          'Missing environment configuration for OIDC authentication',
        );
      }
      const oidcAuthConfig = authConfig
        ?.getOptionalConfig('oidc')
        ?.getOptionalConfig(authEnvironment);
      if (!oidcAuthConfig) {
        throw new Error(
          `Missing request authentication configuration for OIDC in environment: ${authEnvironment}`,
        );
      }
      const requestAuth = {
        oidcTokenProvider: oidcAuthConfig?.getOptionalString('oidcTokenProvider'),
      };
      return await oidcAuth.getCredential(cluster, requestAuth);
    }
    case 'serviceAccount': {
      const serviceAccountAuth = new ServiceAccountStrategy();
      return await serviceAccountAuth.getCredential(cluster);
    }
    default:
      throw new Error(`Unsupported authentication provider: ${authProvider}`);
  }
}