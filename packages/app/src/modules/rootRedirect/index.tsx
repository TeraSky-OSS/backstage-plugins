import { createFrontendModule, PageBlueprint } from "@backstage/frontend-plugin-api";
import { Navigate } from "react-router";

const RootRedirectPage = PageBlueprint.make({
  name: 'catalog-root-redirect',
  params: {
    path: '/',
    loader: async () => <Navigate to="/catalog"  replace/>,
  },
  disabled: false,
});

export const rootRedirectModule = createFrontendModule({
  pluginId: 'app',
  extensions: [RootRedirectPage],
});