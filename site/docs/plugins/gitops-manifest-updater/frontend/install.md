# Installing the GitOps Manifest Updater Frontend Plugin

This guide will help you install and set up the GitOps Manifest Updater frontend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage instance
2. The Scaffolder plugin installed and configured
3. Access to GitHub repositories
4. Kubernetes CRDs with OpenAPI schemas

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-gitops-manifest-updater
```

### 2. Add to Scaffolder Route

Modify your app routes in `packages/app/src/App.tsx`:

```typescript
import { GitOpsManifestUpdaterExtension } from '@terasky/backstage-plugin-gitops-manifest-updater';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';

const routes = (
  <FlatRoutes>
    {/* ... other routes ... */}
    <Route path="/create" element={<ScaffolderPage />}>
      <ScaffolderFieldExtensions>
        <GitOpsManifestUpdaterExtension />
      </ScaffolderFieldExtensions>
    </Route>
  </FlatRoutes>
);
```

### 3. Add to Entity Pages

Add the plugin to your entity pages in `packages/app/src/components/catalog/EntityPage.tsx`:

```typescript
import { GitOpsManifestUpdaterExtension } from '@terasky/backstage-plugin-gitops-manifest-updater';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';

const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/scaffolder" title="Entity Scaffolder">
      <EntityScaffolderContent
        templateGroupFilters={[
          {
            title: 'Management Templates',
            filter: (entity, template) =>
              template.metadata?.labels?.target === 'component',
          },
        ]}
        buildInitialState={entity => ({
          entity: stringifyEntityRef(entity)
        })}
        ScaffolderFieldExtensions={
          <ScaffolderFieldExtensions>
            <RepoUrlPickerFieldExtension />
            <EntityPickerFieldExtension />
            <GitOpsManifestUpdaterExtension />
          </ScaffolderFieldExtensions>
        }
      />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### 4. Add Example Template

Add the example template to your templates directory:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: update-kubernetes-manifest
  title: Update Kubernetes Manifest
  labels:
    target: component
  description: A template to update a claim manifest in Git based on the registered OpenAPI Schema of the XRD
spec:
  owner: user:guest
  type: service
  parameters:
    - title: Entity Selection
      required:
        - entity
      properties:
        entity:
          title: Entity
          type: string
          description: Select the entity to update
          ui:field: EntityPicker
          ui:options:
            catalogFilter:
              - kind: Component
        sourceFileUrl:
          title: Source File URL
          type: string
          description: Override the source file URL (optional - only needed if entity doesn't have terasky.backstage.io/source-file-url annotation)
    - title: GitOps Manifest Updater
      required:
        - gitOpsManifestUpdater
      properties:
        gitOpsManifestUpdater:
          title: GitOps Manifest Updater
          type: object
          ui:field: GitOpsManifestUpdater
  steps:
    - id: get-entity
      name: Get Entity
      action: catalog:fetch
      input:
        entityRef: ${{ parameters.entity }}

    - id: get-annotation-url
      name: Get Annotation URL
      action: roadiehq:utils:jsonata
      input:
        data: 
          annotations: ${{ steps['get-entity'].output.entity.metadata.annotations }}
        expression: |
          annotations."terasky.backstage.io/source-file-url"

    - id: resolve-url
      name: Resolve URL
      action: roadiehq:utils:jsonata
      input:
        data: 
          sourceFileUrl: ${{ parameters.sourceFileUrl }}
          annotationUrl: ${{ steps['get-annotation-url'].output.result }}
        expression: |
          $exists(sourceFileUrl) ? sourceFileUrl : annotationUrl

    - id: validate-url
      name: Validate URL
      action: roadiehq:utils:jsonata
      input:
        data: ${{ steps['resolve-url'].output.result }}
        expression: |
          $string($) ? $ : $error("No source URL provided. Please either add the terasky.backstage.io/source-file-url annotation to the entity or provide a sourceFileUrl parameter")

    - id: get-filepath
      name: Get File Path
      action: roadiehq:utils:jsonata
      input:
        data: ${{ steps['validate-url'].output.result }}
        expression: |
          $join($filter($split($, "/"), function($v, $i) { $i >= 7}), "/")

    - id: fetch-base
      name: Fetch Current Manifest
      action: fetch:plain:file
      input:
        url: ${{ steps['validate-url'].output.result }}
        targetPath: ${{ steps['get-filepath'].output.result }}

    - id: read-original
      name: Read Original File
      action: roadiehq:utils:fs:parse
      input:
        path: ${{ steps['get-filepath'].output.result }}
        parser: yaml

    - id: rebuild-manifest
      name: Rebuild Manifest
      action: roadiehq:utils:jsonata
      input:
        data:
          original: ${{ steps['read-original'].output.content }}
          updates: ${{ parameters.gitOpsManifestUpdater }}
        expression: |
          (
            $newSpec := updates.spec ? updates.spec : updates;
            $updatedMetadata := original.metadata;
            
            /* Merge labels if provided */
            $updatedMetadata := updates.metadata.labels ? 
              $merge([$updatedMetadata, {"labels": updates.metadata.labels}]) : 
              $updatedMetadata;
            
            /* Merge annotations if provided */
            $updatedMetadata := updates.metadata.annotations ? 
              $merge([$updatedMetadata, {"annotations": updates.metadata.annotations}]) : 
              $updatedMetadata;
            
            {
              "apiVersion": original.apiVersion,
              "kind": original.kind,
              "metadata": $updatedMetadata,
              "spec": $newSpec
            }
          )

    - id: write-updated
      name: Write Updated File
      action: roadiehq:utils:serialize:yaml
      input:
        data: ${{ steps['rebuild-manifest'].output.result }}

    - id: save-file
      name: Save File
      action: roadiehq:utils:fs:write
      input:
        path: ${{ steps['get-filepath'].output.result }}
        content: ${{ steps['write-updated'].output.serialized }}

    - id: parse-url
      name: Parse URL for PR
      action: roadiehq:utils:jsonata
      input:
        data: ${{ steps['validate-url'].output.result }}
        expression: |
          {
            "owner": $split($, "/")[3],
            "repo": $split($, "/")[4],
            "branch": $split($, "/")[6]
          }

    - id: format-branch-name
      name: Format Branch Name
      action: roadiehq:utils:jsonata
      input:
        data: ${{ steps['validate-url'].output.result }}
        expression: |
          "backstage-sourced-update-" & $join($filter($split($, "/"), function($v, $i) { $i >= 7}), "-")

    - id: create-pull-request
      name: create-pull-request
      action: publish:github:pull-request
      input:
        repoUrl: ${{ 'github.com?owner=' + steps['parse-url'].output.result.owner + '&repo=' + steps['parse-url'].output.result.repo }}
        branchName: ${{ steps['format-branch-name'].output.result }}
        title: Updating Kubernetes YAML for ${{ steps['get-entity'].output.entity.metadata.name }}
        description: Updating Kubernetes YAML for ${{ steps['get-entity'].output.entity.metadata.name }}
        targetBranchName: ${{ steps['parse-url'].output.result.branch }}

  output:
    links:
      - title: Pull Request
        url: ${{ steps['create-pull-request'].output.remoteUrl }}
      - title: Download YAML Manifest
        url: data:application/yaml;charset=utf-8,${{ steps['write-updated'].output.serialized }}
```

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { gitopsManifestUpdaterPlugin } from '@terasky/backstage-plugin-gitops-manifest-updater/alpha';

export default createApp({
  features: [
    ...
    gitopsManifestUpdaterPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `App.tsx` and other files. The plugin will be automatically integrated into the appropriate locations.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The GitOpsManifestUpdater field is available in templates
3. Forms are generated correctly from CRD schemas
4. Pull requests are created successfully

## Troubleshooting

Common issues and solutions:

1. **Field Not Available**
    - Verify scaffolder field extension registration
    - Check component imports
    - Ensure template configuration is correct

2. **Schema Loading Issues**
    - Verify CRD accessibility
    - Check OpenAPI schema format
    - Review error messages in browser console

3. **PR Creation Problems**
    - Check GitHub token permissions
    - Verify repository access
    - Review branch protection rules

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).
