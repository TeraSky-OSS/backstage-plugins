// React import not needed for JSX in React 17+
import { Header, Page, Content } from '@backstage/core-components';
import { ClusterDeploymentWizard } from './ClusterDeploymentWizard';

export const ClusterDeploymentPage = () => {
  return (
    <Page themeId="tool">
      <Header
        title="Deploy Cluster"
        subtitle="Deploy a new Kubernetes cluster with Spectro Cloud"
      />
      <Content>
        <ClusterDeploymentWizard />
      </Content>
    </Page>
  );
};
