# Installing the VCF Automation Frontend Plugin

This guide will help you install and set up the VCF Automation frontend plugin in your Backstage instance.

## Prerequisites

Before installing this plugin, ensure you have:

1. [VCF Automation Backend Plugin](../backend/about.md) - Required for API integration
2. [VCF Ingestor Plugin](../ingestor/about.md) - Required for entity synchronization

## Installation Steps

### 1. Install the Plugin

Add the plugin to your Backstage project:

```bash
# From your Backstage root directory
yarn --cwd packages/app add @terasky/backstage-plugin-vcf-automation
```

### 2. Register the Plugin

Add the plugin to your app's APIs in `packages/app/src/apis.ts`:

```typescript
import {
  vcfAutomationApiRef,
  VcfAutomationClient,
} from '@terasky/backstage-plugin-vcf-automation';

export const apis: AnyApiFactory[] = [
  // ... other API factories
  createApiFactory({
    api: vcfAutomationApiRef,
    deps: { discoveryApi: discoveryApiRef, identityApi: identityApiRef },
    factory: ({ discoveryApi, identityApi }) => 
      new VcfAutomationClient({ discoveryApi, identityApi }),
  }),
];
```

### 3. Add to App.tsx

Add the plugin to your `packages/app/src/App.tsx`:

```typescript
import { vcfAutomationPlugin } from '@terasky/backstage-plugin-vcf-automation';

const app = createApp({
  apis,
  bindRoutes({ bind }) {
    // ... other bindings
    bind(vcfAutomationPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
  },
});
```

### 4. Add Components to Entity Pages

Add the VCF Automation components to your entity pages in `packages/app/src/components/catalog/EntityPage.tsx`:

```typescript
import {
  VCFAutomationDeploymentOverview,
  VCFAutomationDeploymentDetails,
  VCFAutomationVSphereVMOverview,
  VCFAutomationVSphereVMDetails,
  VCFAutomationGenericResourceOverview,
  VCFAutomationGenericResourceDetails,
  VCFAutomationProjectOverview,
  VCFAutomationProjectDetails,
} from '@terasky/backstage-plugin-vcf-automation';
import { Entity } from '@backstage/catalog-model';

// For VSphere VMs
const vcfAutomationVSphereVMPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <VCFAutomationVSphereVMOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationVSphereVMDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

// Add to your component page switch
const componentPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isComponentType('Cloud.vSphere.Machine')}>
      {vcfAutomationVSphereVMPage}
    </EntitySwitch.Case>
    // ... other cases
  </EntitySwitch>
);

// For VCF Deployments
const hasVcfAutomationDeploymentStatus = (entity: Entity): boolean => 
  Boolean(entity.metadata?.annotations?.['terasky.backstage.io/vcf-automation-deployment-status']);

const vcfAutomationDeploymentPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <VCFAutomationDeploymentOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationDeploymentDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

// For Generic Resources
const hasVcfAutomationResourceType = (entity: Entity): boolean => 
  Boolean(entity.metadata?.annotations?.['terasky.backstage.io/vcf-automation-resource-type']);

const vcfAutomationGenericResourcePage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <VCFAutomationGenericResourceOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationGenericResourceDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

// For Projects (in Domain page)
const domainPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <VCFAutomationProjectOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationProjectDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

// Add a Resources Page
const resourcePage = (
  <EntitySwitch>
    <EntitySwitch.Case if={hasVcfAutomationResourceType}>
      {vcfAutomationGenericResourcePage}
    </EntitySwitch.Case>
    <EntitySwitch.Case>
      {defaultEntityPage}
    </EntitySwitch.Case>
  </EntitySwitch>
);

// CCI Component Pages (New in latest version)
const cciNamespacePage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <VCFAutomationCCINamespaceOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/details" title="Details">
      <VCFAutomationCCINamespaceDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

const cciResourcePage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <VCFAutomationCCIResourceOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/details" title="Details">
      <VCFAutomationCCIResourceDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

// Component Page with CCI Support
const componentPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isComponentType('CCI.Supervisor.Namespace')}>
      {cciNamespacePage}
    </EntitySwitch.Case>
    <EntitySwitch.Case if={isComponentType('CCI.Supervisor.Resource')}>
      {cciResourcePage}
    </EntitySwitch.Case>
    <EntitySwitch.Case if={hasVcfAutomationVSphereVMType}>
      {vcfAutomationVSphereVMPage}
    </EntitySwitch.Case>
    <EntitySwitch.Case>
      {defaultEntityPage}
    </EntitySwitch.Case>
  </EntitySwitch>
);

// Update the entityPage constant to include all pages
export const entityPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isKind('component')} children={componentPage} />
    <EntitySwitch.Case if={isKind('resource')} children={resourcePage} />
    <EntitySwitch.Case if={isKind('domain')} children={domainPage} />
    <EntitySwitch.Case if={isKind('system')} children={systemPage} />
    // ... other cases
  </EntitySwitch>
);
```

### CCI Component Type Checks

Add the following helper functions for CCI component type checking:

```typescript
import { Entity } from '@backstage/catalog-model';

export const isComponentType = (type: string) => (entity: Entity) =>
  entity?.kind === 'Component' && entity.spec?.type === type;
```

## Available Components Summary

The VCF Automation frontend plugin now provides the following components:

### Traditional Components
- `VCFAutomationDeploymentOverview` & `VCFAutomationDeploymentDetails` - For VCF deployments
- `VCFAutomationVSphereVMOverview` & `VCFAutomationVSphereVMDetails` - For vSphere VMs
- `VCFAutomationGenericResourceOverview` & `VCFAutomationGenericResourceDetails` - For generic resources
- `VCFAutomationProjectOverview` & `VCFAutomationProjectDetails` - For VCF projects

### CCI Components (New)
- `VCFAutomationCCINamespaceOverview` & `VCFAutomationCCINamespaceDetails` - For CCI Supervisor Namespaces
- `VCFAutomationCCIResourceOverview` & `VCFAutomationCCIResourceDetails` - For CCI Supervisor Resources
- `VCFAutomationVMPowerManagement` - For VM power management (automatically included in CCI resource overview for VMs)

### Entity Type Mappings
- **CCI.Supervisor.Namespace** → Uses CCI Namespace components
- **CCI.Supervisor.Resource** → Uses CCI Resource components  
- **Cloud.vSphere.Machine** → Uses vSphere VM components
- **Other types** → Uses generic resource components

## VM Power Management

For VirtualMachine components in all-apps organizations, the plugin provides power management capabilities:

### Features

- **Power State Display**: Shows current VM power state (PoweredOn/PoweredOff)
- **Power Actions**: Power On/Off buttons based on current state  
- **Permission Control**: Requires `vcf-automation.vm-power-management.run` permission (defined in vcf-automation-common)
- **Confirmation Dialogs**: Confirms actions before execution
- **Support for Both VM Types**:
  - **Deployment-managed VMs**: Uses deployment API to check action validity and execute
  - **Standalone VMs**: Uses Kubernetes API to check status and update power state

### Permissions

Add the following permission to your permission policy:

```typescript
import { vmPowerManagementPermission } from '@terasky/backstage-plugin-vcf-automation-common';

// In your permission policy:
{
  permission: vmPowerManagementPermission,
  result: AuthorizeResult.ALLOW, // or implement conditional logic as needed
}
```

The permission is defined in the `vcf-automation-common` plugin and automatically registered with the permission system.

### Usage

The power management component is automatically included in `VCFAutomationCCIResourceOverview` for VirtualMachine entities in all-apps organizations. No additional configuration is required.

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { vcfAutomationPlugin } from '@terasky/backstage-plugin-vcf-automation/alpha';

export default createApp({
  features: [
    ...
    vcfAutomationPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## What's Next?

- [Configure the plugin](configure.md)
- [Learn about the plugin's features](about.md)
