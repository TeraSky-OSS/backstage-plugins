import { createDevApp } from '@backstage/dev-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { DevpodComponent } from '../src/components/DevpodComponent/DevpodComponent';
import { DevpodProvider } from '../src/components/DevpodProvider/DevpodProvider';

const mockEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'example-component',
    annotations: {
      'backstage.io/source-location': 'url:https://github.com/example-org/example-repo',
    },
  },
  spec: {
    type: 'service',
    owner: 'team-a',
    lifecycle: 'production',
  },
};

createDevApp()
  .addPage({
    path: '/devpod',
    title: 'Devpod',
    element: (
      <EntityProvider entity={mockEntity}>
        <DevpodProvider>
          <DevpodComponent />
        </DevpodProvider>
      </EntityProvider>
    ),
  })
  .render();
