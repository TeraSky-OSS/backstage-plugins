import { Navigate, Route } from 'react-router-dom';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  CatalogImportPage,
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import { SearchPage } from '@backstage/plugin-search';
import {
  TechDocsIndexPage,
  techdocsPlugin,
  TechDocsReaderPage,
} from '@backstage/plugin-techdocs';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';
import { UserSettingsPage } from '@backstage/plugin-user-settings';
import { apis } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';
import { vcfAutomationPlugin } from '@terasky/backstage-plugin-vcf-automation';

import {
  AlertDisplay,
  OAuthRequestDialog,
  SignInPage,
} from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { CatalogGraphPage } from '@backstage/plugin-catalog-graph';
import { RequirePermission } from '@backstage/plugin-permission-react';
import { catalogEntityCreatePermission } from '@backstage/plugin-catalog-common/alpha';
import { RbacPage } from '@backstage-community/plugin-rbac';
import { githubAuthApiRef, microsoftAuthApiRef, gitlabAuthApiRef } from '@backstage/core-plugin-api';
import { themes, UnifiedThemeProvider } from '@backstage/theme';
import { teraskyLightTheme, teraskyDarkTheme } from './theme/teraskyTheme';
import LightIcon from '@material-ui/icons/WbSunny';
import Brightness2Icon from '@material-ui/icons/Brightness2';
import { configApiRef,  useApi } from '@backstage/core-plugin-api';
import { GitOpsManifestUpdaterExtension } from '@terasky/backstage-plugin-gitops-manifest-updater';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { EducatesPage } from '@terasky/backstage-plugin-educates';
import { TerraformModuleExtension } from '@terasky/backstage-plugin-terraform-scaffolder';

const app = createApp({
  apis,
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      viewTechDoc: techdocsPlugin.routes.docRoot,
      createFromTemplate: scaffolderPlugin.routes.selectedTemplate,
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: catalogImportPlugin.routes.importPage,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogImportPlugin.routes.importPage,
      viewTechDoc: techdocsPlugin.routes.docRoot,
    });
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
    bind(vcfAutomationPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
  },
  components: {
    SignInPage: props => {
      const configApi = useApi(configApiRef);
      if (configApi.getOptionalString('auth.environment') === 'development' || false) {
        return (
          <SignInPage
            {...props}
            providers={[
              'guest',
              {
                id: 'github-auth-provider',
                title: 'GitHub',
                message: 'Sign in using GitHub',
                apiRef: githubAuthApiRef,
              },
              {
                id: 'microsoft-auth-provider',
                title: 'Microsoft',
                message: 'Sign in using EntraID',
                apiRef: microsoftAuthApiRef,
              },
              {
                id: 'gitlab-auth-provider',
                title: 'GitLab',
                message: 'Sign in using GitLab',
                apiRef: gitlabAuthApiRef,
              },
            ]}
          />
        );
      }
      return (
        <SignInPage
          {...props}
          providers={[
            {
              id: 'github-auth-provider',
              title: 'GitHub',
              message: 'Sign in using GitHub',
              apiRef: githubAuthApiRef,
            },
            {
              id: 'microsoft-auth-provider',
              title: 'Microsoft',
              message: 'Sign in using EntraID',
              apiRef: microsoftAuthApiRef,
            },
            {
              id: 'gitlab-auth-provider',
              title: 'GitLab',
              message: 'Sign in using GitLab',
              apiRef: gitlabAuthApiRef,
            },
          ]}
        />
      );
    }
  },
  themes: [{
    id: 'terasky-light',
    title: 'TeraSky Light',
    variant: 'light',
    icon: <LightIcon />,
    Provider: ({ children }) => (
      <UnifiedThemeProvider theme={teraskyLightTheme} children={children} />
    ),
  },
  {
    id: 'terasky-dark',
    title: 'TeraSky Dark',
    variant: 'dark',
    icon: <Brightness2Icon />,
    Provider: ({ children }) => (
      <UnifiedThemeProvider theme={teraskyDarkTheme} children={children} />
    ),
  },
  {
    id: 'default-dark',
    title: 'Default Dark',
    variant: 'dark',
    Provider: ({ children }) => <UnifiedThemeProvider theme={themes.dark} children={children} />,
  },
  {
    id: 'default-light',
    title: 'Default Light',
    variant: 'light',
    Provider: ({ children }) => <UnifiedThemeProvider theme={themes.light} children={children} />,
  },
],
});

const routes = (
  <FlatRoutes>
    <Route path="/" element={<Navigate to="catalog" />} />
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {entityPage}
    </Route>
    <Route path="/docs" element={<TechDocsIndexPage />} />
    <Route
      path="/docs/:namespace/:kind/:name/*"
      element={<TechDocsReaderPage />}
    >
      <TechDocsAddons>
        <ReportIssue />
      </TechDocsAddons>
    </Route>
    <Route path="/create" element={
      <ScaffolderPage
        groups={[
          {
            title: 'Crossplane Claims',
            filter: (template) => template.metadata?.labels?.source === 'crossplane',
          },
          {
            title: 'General CRDs',
            filter: (template) => template.metadata?.labels?.source === 'kubernetes',
          },

        ]}
        templateFilter={template =>
          template.metadata?.labels?.target !== 'component'
        } 
      />
      }>
      <ScaffolderFieldExtensions>
        <GitOpsManifestUpdaterExtension />
        <TerraformModuleExtension />
      </ScaffolderFieldExtensions>
    </Route>
    <Route path="/api-docs" element={<ApiExplorerPage />} />
    <Route
      path="/catalog-import"
      element={
        <RequirePermission permission={catalogEntityCreatePermission}>
          <CatalogImportPage />
        </RequirePermission>
      }
    />
    <Route path="/search" element={<SearchPage />}>
      {searchPage}
    </Route>
    <Route path="/settings" element={<UserSettingsPage />} />
    <Route path="/catalog-graph" element={<CatalogGraphPage />} />
    <Route path="/rbac" element={<RbacPage />} />
    <Route path="/educates" element={<EducatesPage />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
