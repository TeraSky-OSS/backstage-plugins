import { useEffect, useState } from 'react';
import { useApiHolder } from '@backstage/core-plugin-api';
import { KNOWN_FIELD_EXTENSIONS, DISABLE_AUTO_DISCOVERY } from '../config/fieldExtensions';

export interface DiscoveredFieldExtension {
  name: string;
  displayName?: string;
  description?: string;
}

/**
 * Hook to discover all available field extensions in the current Backstage instance.
 * Field extensions are registered on the FRONTEND via the scaffolder plugin.
 */
export function useFieldExtensions(): {
  extensions: string[];
  loading: boolean;
  error?: string;
} {
  const [extensions, setExtensions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const apiHolder = useApiHolder();

  useEffect(() => {
    let mounted = true;

    async function discoverExtensions() {
      try {
        const discoveredExtensions = new Set<string>();

        // Strategy 0: Add configured extensions from config file
        KNOWN_FIELD_EXTENSIONS.forEach(ext => discoveredExtensions.add(ext));

        if (DISABLE_AUTO_DISCOVERY) {
          if (mounted) {
            setExtensions(Array.from(discoveredExtensions).sort());
            setLoading(false);
          }
          return;
        }

        // Strategy 1: Access the scaffolder plugin's field extension registry
        // Field extensions are registered via createScaffolderFieldExtension and stored in the plugin
        try {
          // Try to access the extension registry from the API holder
          const extensionIds = (apiHolder as any).getExtensionIds?.() || [];
          
          // Filter for scaffolder field extensions
          const fieldExtensionIds = extensionIds.filter((id: string) => 
            id.includes('scaffolder.field') || id.includes('field-extension')
          );
          
          fieldExtensionIds.forEach((id: string) => {
            // Extract the field name from the extension ID
            // e.g., "scaffolder.field.spring-initializer" -> "SpringInitializer"
            const parts = id.split('.');
            const fieldName = parts[parts.length - 1];
            if (fieldName) {
              discoveredExtensions.add(fieldName);
            }
          });
        } catch (err) {
          // Silently continue
        }

        // Strategy 2: Check for scaffolder field extensions in the window object
        // Some plugins expose their field extensions globally
        if (typeof window !== 'undefined') {
          const possiblePaths = [
            (window as any).__SCAFFOLDER_FIELD_EXTENSIONS__,
            (window as any).scaffolderFieldExtensions,
            (window as any).backstage?.scaffolder?.fieldExtensions,
            (window as any).__backstage?.scaffolder?.fieldExtensions,
          ];

          for (const path of possiblePaths) {
            if (path && typeof path === 'object') {
              Object.keys(path).forEach(name => {
                discoveredExtensions.add(name);
              });
            }
          }

          // Check if React context has scaffolder fields
          // Extensions might be in React.createElement calls
          const root = document.getElementById('root');
          if (root) {
            try {
              // Try to find scaffolder field components in the React tree
              // React fiber tree traversal not implemented
            } catch (err) {
              // Silently continue
            }
          }

          // Check sessionStorage/localStorage for cached field extensions
          try {
            const cached = sessionStorage.getItem('scaffolder-field-extensions');
            if (cached) {
              const cachedExtensions = JSON.parse(cached);
              if (Array.isArray(cachedExtensions)) {
                cachedExtensions.forEach(ext => discoveredExtensions.add(ext));
              }
            }
          } catch (err) {
            // No cached extensions
          }
        }

        // Strategy 3: Try to import and check the scaffolder-react plugin
        try {
          // Dynamic import to avoid build-time dependency issues
          const scaffolderReact = await import('@backstage/plugin-scaffolder-react');
          
          // Check if there's a registry or list of field extensions
          if ((scaffolderReact as any).fieldExtensions) {
            const fieldExts = (scaffolderReact as any).fieldExtensions;
            if (Array.isArray(fieldExts)) {
              fieldExts.forEach(ext => discoveredExtensions.add(ext));
            } else if (typeof fieldExts === 'object') {
              Object.keys(fieldExts).forEach(name => discoveredExtensions.add(name));
            }
          }
        } catch (err) {
          // Silently continue
        }

        const extensionList = Array.from(discoveredExtensions).sort();

        // Cache the discovered extensions
        if (typeof window !== 'undefined' && extensionList.length > 0) {
          try {
            sessionStorage.setItem('scaffolder-field-extensions', JSON.stringify(extensionList));
          } catch (err) {
            // Could not cache
          }
        }

        if (mounted) {
          setExtensions(extensionList);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to discover field extensions');
          // Use configured extensions as fallback
          setExtensions(KNOWN_FIELD_EXTENSIONS.sort());
          setLoading(false);
        }
      }
    }

    discoverExtensions();

    return () => {
      mounted = false;
    };
  }, [apiHolder]);

  return { extensions, loading, error };
}
