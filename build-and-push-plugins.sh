#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
OUTPUT_DIR="$REPO_ROOT/dynamic-plugins-root"

echo "==> Cleaning up $OUTPUT_DIR"
rm -rf "$OUTPUT_DIR"

echo "==> Creating $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "==> Bundling plugins into $OUTPUT_DIR"

for plugin_dir in "$PLUGINS_DIR"/*/; do
  plugin_name="$(basename "$plugin_dir")"

  if [[ "$plugin_name" == *-common ]]; then
    echo "    Skipping $plugin_name (common package)"
    continue
  fi

  echo "    Bundling $plugin_name"
  (cd "$plugin_dir" && yarn backstage-cli package bundle --output-destination "$OUTPUT_DIR")
done

echo ""
echo "==> Packing and pushing OCI images from $OUTPUT_DIR"

for bundle_dir in "$OUTPUT_DIR"/*/; do
  folder_name="$(basename "$bundle_dir")"
  pkg_json="$bundle_dir/package.json"

  if [[ ! -f "$pkg_json" ]]; then
    echo "    Skipping $folder_name (no package.json found)"
    continue
  fi

  version="$(node -p "require('$pkg_json').version")"
  tag="ghcr.io/terasky-oss/${folder_name}:${version}"

  echo "    Processing $folder_name @ $version"
  (
    cd "$bundle_dir"
    ARCHIVE="$(npm pack 2>/dev/null)"
    crane append --oci-empty-base -f "$ARCHIVE" --new_tag "$tag"
    crane mutate "$tag" --set-platform linux/amd64 --tag "$tag"
    rm -f "$ARCHIVE"
  )
done

echo ""
echo "==> Done"
