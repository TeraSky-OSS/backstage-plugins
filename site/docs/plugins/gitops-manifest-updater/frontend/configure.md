# Configuring the GitOps Manifest Updater Frontend Plugin

This guide covers the configuration options available for the GitOps Manifest Updater frontend plugin.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. The plugin will be automatically integrated into the appropriate locations without requiring manual route configuration.

### Example Configuration for GitHub based SCM
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

### Example Configuration for Gitlab based SCM
  
```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: update-kubernetes-manifest-gitlab
  title: Update Kubernetes Manifest From Gitlab
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
          $join($filter($split($, "/"), function($v, $i) { $i >= 8}), "/")

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
            "branch": $split($, "/")[7]
          }

    - id: format-branch-name
      name: Format Branch Name
      action: roadiehq:utils:jsonata
      input:
        data: ${{ steps['validate-url'].output.result }}
        expression: |
          "backstage-sourced-update-" & $join($filter($split($, "/"), function($v, $i) { $i >= 8}), "-")

    - id: create-merge-request
      name: create-merge-request
      action: publish:gitlab:merge-request
      input:
        repoUrl: ${{ 'gitlab.com?owner=' + steps['parse-url'].output.result.owner + '&repo=' + steps['parse-url'].output.result.repo }}
        branchName: ${{ steps['format-branch-name'].output.result }}
        title: Updating Kubernetes YAML for ${{ steps['get-entity'].output.entity.metadata.name }}
        description: Updating Kubernetes YAML for ${{ steps['get-entity'].output.entity.metadata.name }}
        targetBranchName: ${{ steps['parse-url'].output.result.branch }}

  output:
    links:
      - title: Merge Request
        url: ${{ steps['create-merge-request'].output.mergeRequestUrl }}
      - title: Download YAML Manifest
        url: data:application/yaml;charset=utf-8,${{ steps['write-updated'].output.serialized }}
```
  
## Component Configuration

### Integration Examples

#### Basic Integration
```react
<ScaffolderFieldExtensions>
  <GitOpsManifestUpdaterExtension />
</ScaffolderFieldExtensions>
```

#### Advanced Integration
```react
<ScaffolderFieldExtensions>
  <GitOpsManifestUpdaterExtension
    defaultBranch="develop"
    defaultPath="k8s/"
    schemaValidator={customValidator}
    pullRequestCreator={customPRCreator}
  />
</ScaffolderFieldExtensions>
```


## Best Practices

1. **Template Design**
    - Use clear, descriptive titles
    - Provide helpful descriptions
    - Set appropriate default values
    - Include validation rules

2. **Repository Structure**
    - Organize manifests logically
    - Use consistent file paths
    - Follow GitOps practices
    - Maintain clear documentation

3. **Pull Requests**
    - Use descriptive titles
    - Provide detailed descriptions
    - Apply appropriate labels
    - Follow team conventions

For installation instructions, refer to the [Installation Guide](./install.md).
