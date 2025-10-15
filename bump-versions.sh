#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get current version from package.json
get_version() {
  local package_json="$1"
  local abs_path="$(cd "$(dirname "$package_json")" && pwd)/$(basename "$package_json")"
  node -p "require('$abs_path').version"
}

# Function to get package name from package.json
get_package_name() {
  local package_json="$1"
  local abs_path="$(cd "$(dirname "$package_json")" && pwd)/$(basename "$package_json")"
  node -p "require('$abs_path').name"
}

# Function to bump version
bump_version() {
  local version="$1"
  local bump_type="$2"
  
  IFS='.' read -r major minor patch <<< "$version"
  
  if [ "$bump_type" = "minor" ]; then
    minor=$((minor + 1))
    patch=0
  elif [ "$bump_type" = "patch" ]; then
    patch=$((patch + 1))
  fi
  
  echo "$major.$minor.$patch"
}

# Function to update version in package.json
update_package_version() {
  local package_json="$1"
  local new_version="$2"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$package_json"
  else
    # Linux
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$package_json"
  fi
}

# Function to update dependency version in package.json
update_dependency_version() {
  local package_json="$1"
  local package_name="$2"
  local new_version="$3"
  
  # Escape special characters in package name for sed
  local escaped_name=$(echo "$package_name" | sed 's/[\/&]/\\&/g')
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - update in dependencies
    sed -i '' "s/\"$escaped_name\": \"[^\"]*\"/\"$escaped_name\": \"^$new_version\"/" "$package_json"
  else
    # Linux - update in dependencies
    sed -i "s/\"$escaped_name\": \"[^\"]*\"/\"$escaped_name\": \"^$new_version\"/" "$package_json"
  fi
}

# Function to check if dependencies changed in git diff
check_dependency_changes() {
  local package_json="$1"
  
  # Check if file has any git changes
  if ! git diff --quiet HEAD "$package_json" 2>/dev/null; then
    local diff_output=$(git diff HEAD "$package_json" 2>/dev/null || echo "")
    
    # Check if dependencies section changed (not devDependencies)
    if echo "$diff_output" | grep -A 100 '"dependencies"' | grep -B 100 '"devDependencies"\|"peerDependencies"\|"scripts"\|^}' | grep -q '^\+.*".*":'; then
      echo "dependencies"
      return
    fi
    
    # Check if only devDependencies changed
    if echo "$diff_output" | grep -A 100 '"devDependencies"' | grep -B 100 '"peerDependencies"\|"scripts"\|^}' | grep -q '^\+.*".*":'; then
      echo "devDependencies"
      return
    fi
  fi
  
  echo "none"
}

# Declare associative array to store plugin versions
declare -A PLUGIN_VERSIONS

log_info "Starting version bump process..."
echo ""

# Step 1: Run backstage-cli versions:bump
log_info "Step 1: Running backstage-cli versions:bump..."
if yarn backstage-cli versions:bump; then
  log_success "Backstage CLI versions bump completed"
else
  log_error "Failed to run backstage-cli versions:bump"
  exit 1
fi
echo ""

# Step 2: Bump versions for each plugin based on changes
log_info "Step 2: Bumping plugin versions based on changes..."
echo ""

for plugin_dir in plugins/*/; do
  if [ ! -d "$plugin_dir" ]; then
    continue
  fi
  
  package_json="${plugin_dir}package.json"
  
  if [ ! -f "$package_json" ]; then
    log_warning "No package.json found in $plugin_dir, skipping..."
    continue
  fi
  
  plugin_name=$(get_package_name "$package_json")
  current_version=$(get_version "$package_json")
  change_type=$(check_dependency_changes "$package_json")
  
  bump_type=""
  if [ "$change_type" = "dependencies" ]; then
    bump_type="minor"
    log_info "Plugin: $plugin_name - Dependencies changed, bumping minor version"
  elif [ "$change_type" = "devDependencies" ]; then
    bump_type="patch"
    log_info "Plugin: $plugin_name - Only devDependencies changed, bumping patch version"
  else
    bump_type="patch"
    log_info "Plugin: $plugin_name - No dependency changes detected, bumping patch version"
  fi
  
  new_version=$(bump_version "$current_version" "$bump_type")
  update_package_version "$package_json" "$new_version"
  
  # Store the new version for later use
  PLUGIN_VERSIONS["$plugin_name"]="$new_version"
  
  log_success "Bumped $plugin_name from $current_version to $new_version ($bump_type)"
done
echo ""

# Step 3: Update internal @terasky dependencies in plugins
log_info "Step 3: Updating internal @terasky dependencies in plugins..."
echo ""

for plugin_dir in plugins/*/; do
  if [ ! -d "$plugin_dir" ]; then
    continue
  fi
  
  package_json="${plugin_dir}package.json"
  
  if [ ! -f "$package_json" ]; then
    continue
  fi
  
  plugin_name=$(get_package_name "$package_json")
  abs_package_json="$(cd "$(dirname "$package_json")" && pwd)/$(basename "$package_json")"
  
  # Check if this plugin has any @terasky dependencies
  terasky_deps=$(node -p "
    const pkg = require('$abs_package_json');
    const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
    Object.keys(deps).filter(name => name.startsWith('@terasky')).join(' ');
  " 2>/dev/null || echo "")
  
  if [ -n "$terasky_deps" ]; then
    log_info "Updating @terasky dependencies in $plugin_name"
    
    for dep in $terasky_deps; do
      if [ -n "${PLUGIN_VERSIONS[$dep]}" ]; then
        new_dep_version="${PLUGIN_VERSIONS[$dep]}"
        update_dependency_version "$package_json" "$dep" "$new_dep_version"
        log_success "  Updated $dep to ^$new_dep_version"
      fi
    done
  fi
done
echo ""

# Step 4: Update packages/app and packages/backend
log_info "Step 4: Updating packages/app and packages/backend with new plugin versions..."
echo ""

for package_dir in packages/app packages/backend; do
  package_json="${package_dir}/package.json"
  
  if [ ! -f "$package_json" ]; then
    log_warning "No package.json found in $package_dir, skipping..."
    continue
  fi
  
  log_info "Updating $package_dir/package.json"
  abs_package_json="$(cd "$(dirname "$package_json")" && pwd)/$(basename "$package_json")"
  
  # Get all @terasky dependencies in this package
  terasky_deps=$(node -p "
    const pkg = require('$abs_package_json');
    const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
    Object.keys(deps).filter(name => name.startsWith('@terasky')).join(' ');
  " 2>/dev/null || echo "")
  
  if [ -n "$terasky_deps" ]; then
    for dep in $terasky_deps; do
      if [ -n "${PLUGIN_VERSIONS[$dep]}" ]; then
        new_dep_version="${PLUGIN_VERSIONS[$dep]}"
        update_dependency_version "$package_json" "$dep" "$new_dep_version"
        log_success "  Updated $dep to ^$new_dep_version"
      fi
    done
  else
    log_info "  No @terasky dependencies found"
  fi
done
echo ""

# Step 5: Run yarn install
log_info "Step 5: Running yarn install..."
if yarn install; then
  log_success "Yarn install completed successfully"
else
  log_error "Failed to run yarn install"
  exit 1
fi
echo ""

log_success "Version bump process completed successfully!"
echo ""
log_info "Summary of version changes:"
for plugin_name in "${!PLUGIN_VERSIONS[@]}"; do
  echo "  $plugin_name: ${PLUGIN_VERSIONS[$plugin_name]}"
done
echo ""
log_info "Don't forget to commit your changes!"

