import { useMemo } from 'react';
import { 
  createFrontendModule, 
  SignInPageBlueprint,
  githubAuthApiRef,
  gitlabAuthApiRef,
  microsoftAuthApiRef,
  googleAuthApiRef,
  oktaAuthApiRef,
  oneloginAuthApiRef,
  openshiftAuthApiRef,
  atlassianAuthApiRef,
  bitbucketAuthApiRef,
  bitbucketServerAuthApiRef,
  vmwareCloudAuthApiRef,
} from '@backstage/frontend-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

// Define default configurations for each provider
const providerDefaults = {
  github: {
    id: 'github-auth-provider',
    title: 'GitHub',
    message: 'Sign in using GitHub',
    apiRef: githubAuthApiRef,
  },
  gitlab: {
    id: 'gitlab-auth-provider',
    title: 'GitLab',
    message: 'Sign in using GitLab',
    apiRef: gitlabAuthApiRef,
  },
  microsoft: {
    id: 'microsoft-auth-provider',
    title: 'Microsoft',
    message: 'Sign in using Microsoft',
    apiRef: microsoftAuthApiRef,
  },
  google: {
    id: 'google-auth-provider',
    title: 'Google',
    message: 'Sign in using Google',
    apiRef: googleAuthApiRef,
  },
  okta: {
    id: 'okta-auth-provider',
    title: 'Okta',
    message: 'Sign in using Okta',
    apiRef: oktaAuthApiRef,
  },
  onelogin: {
    id: 'onelogin-auth-provider',
    title: 'OneLogin',
    message: 'Sign in using OneLogin',
    apiRef: oneloginAuthApiRef,
  },
  openshift: {
    id: 'openshift-auth-provider',
    title: 'OpenShift',
    message: 'Sign in using OpenShift',
    apiRef: openshiftAuthApiRef,
  },
  atlassian: {
    id: 'atlassian-auth-provider',
    title: 'Atlassian',
    message: 'Sign in using Atlassian',
    apiRef: atlassianAuthApiRef,
  },
  bitbucket: {
    id: 'bitbucket-auth-provider',
    title: 'Bitbucket',
    message: 'Sign in using Bitbucket',
    apiRef: bitbucketAuthApiRef,
  },
  bitbucketServer: {
    id: 'bitbucket-server-auth-provider',
    title: 'Bitbucket Server',
    message: 'Sign in using Bitbucket Server',
    apiRef: bitbucketServerAuthApiRef,
  },
  vmwareCloud: {
    id: 'vmware-cloud-auth-provider',
    title: 'VMware Cloud',
    message: 'Sign in using VMware Cloud',
    apiRef: vmwareCloudAuthApiRef,
  },
  spectrocloud: {
    id: 'spectrocloud-auth-provider',
    title: 'SpectroCloud',
    message: 'Sign in using SpectroCloud',
    apiRef: spectroCloudAuthApiRef,
  },
};

// Wrapper component that reads config and builds providers
const ConfigurableSignInPage = (props: any) => {
  const config = useApi(configApiRef);
  
  const providers = useMemo(() => {
    const providersList: any[] = [];
    
    // Check if guest provider is enabled
    const enableGuestProvider = config.getOptionalBoolean('signinPage.enableGuestProvider') ?? false;
    if (enableGuestProvider) {
      providersList.push('guest');
    }
    
    // Check each provider and add if enabled
    for (const [providerKey, defaults] of Object.entries(providerDefaults)) {
      const enabled = config.getOptionalBoolean(`signinPage.providers.${providerKey}.enabled`) ?? false;
      
      if (enabled) {
        const title = config.getOptionalString(`signinPage.providers.${providerKey}.title`) ?? defaults.title;
        const message = config.getOptionalString(`signinPage.providers.${providerKey}.message`) ?? defaults.message;
        
        providersList.push({
          id: defaults.id,
          title,
          message,
          apiRef: defaults.apiRef,
        });
      }
    }
    
    return providersList;
  }, [config]);
  
  return <SignInPage {...props} providers={providers} />;
};

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => <ConfigurableSignInPage {...props} />,
  },
});

export const appModuleGlobalSigninPage = createFrontendModule({
  pluginId: 'app',
  extensions: [signInPage],
});
