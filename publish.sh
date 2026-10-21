#!/bin/bash
set -x
# Navigate to the plugins directory
cd plugins

# Loop through each folder in the plugins directory
for folder in */ ; do
  # Remove the trailing slash from the folder name
  folder=${folder%/}
  
  echo "Processing $folder..."
  
  # Run the build command
  yarn --cwd "$folder" build
  
  # Check if the package already exists
  package_name=$(jq -r .name "$folder/package.json")
  package_version=$(jq -r .version "$folder/package.json")
  
  if npm show "$package_name@$package_version" > /dev/null 2>&1; then
    echo "Package $package_name@$package_version already exists. Skipping publish."
  else
    echo "Publishing $package_name@$package_version..."
    cd "$folder"
    npm publish --access public --provenance
    cd ..
  fi
done
