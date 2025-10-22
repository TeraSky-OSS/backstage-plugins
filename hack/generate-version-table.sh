#!/bin/bash

# Move to the repository root directory (assuming script is in hack/)
cd "$(dirname "$0")/.." || exit

# Print table header
echo "| Folder | Type | Package | Version | Link |"
echo "|--------|------|---------|----------|------|"

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
        else
            type="Frontend"  # Default type
        fi
        
        # Create markdown table row
        folder_link="[Code](./${folder}/)"
        npm_link="[NPMJS](https://www.npmjs.com/package/${name}/v/${version})"
        
        echo "| $folder_link | $type | $name | $version | $npm_link |"
    fi
done | sort
