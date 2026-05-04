#!/bin/bash

# Move to the repository root directory (assuming script is in hack/)
cd "$(dirname "$0")/.." || exit

# Print table header
echo "| Folder | Type | Package | Version | Links |"
echo "|--------|------|---------|----------|-------|"

# List immediate subdirectories of plugins and process their package.json files
for dir in plugins/*/; do
    if [ -f "${dir}package.json" ]; then
        folder=${dir%/}  # Remove trailing slash
        file="${dir}package.json"
        
        # Extract values from package.json using jq
        name=$(jq -r .name "$file")
        version=$(jq -r .version "$file")
        
        # Determine type based on folder name or package.json content
        if [[ $folder == *"-backend"* ]]; then
            type="Backend"
        elif [[ $folder == *"-ingestor"* ]]; then
            type="Catalog Entity Provider"
        elif [[ $folder == *"-frontend"* ]]; then
            type="Frontend"
        elif [[ $folder == *"-common"* ]]; then
            type="Shared Module"
        elif [[ $folder == "entity-scaffolder-content" ]]; then
            type="Frontend"
        elif [[ $folder == "terraform-scaffolder" ]]; then
            type="Scaffolder Field Extension"
        elif [[ $folder == "gitops-manifest-updater" ]]; then
            type="Scaffolder Field Extension"
        elif [[ $folder == *"scaffolder"* && $folder == *"field"* ]]; then
            type="Scaffolder Field Extension"
        elif [[ $folder == *"scaffolder"* ]]; then
            type="Scaffolder Actions"
        elif [[ $folder == *"cluster-provider"* ]]; then
            type="Kubernetes Cluster Locator"
        else
            type="Frontend"  # Default type
        fi
        
        # Create markdown table row
        folder_link="[Code](./${folder}/)"
        npm_link="[NPMJS](https://www.npmjs.com/package/${name}/v/${version})"

        # Build links column: shared modules have no GHCR image, all others do
        if [[ $type == "Shared Module" ]]; then
            links="$npm_link"
        elif [[ $name == "@terasky/backstage-plugin-module-federation-cdn-backend" ]]; then
            links="$npm_link"
        else
            # Derive GHCR image name: strip leading '@' and replace '/' with '-'
            ghcr_name="${name#@}"
            ghcr_name="${ghcr_name/\//-}"
            ghcr_link="[GHCR](https://github.com/TeraSky-OSS/backstage-plugins/pkgs/container/${ghcr_name})"
            links="$npm_link, $ghcr_link"
        fi
        
        echo "| $folder_link | $type | $name | $version | $links |"
    fi
done | sort
