import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Box, Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { templateBuilderApiRef } from '../../api';
import { EditorLayout } from './EditorLayout';
import { useTemplateState } from './useTemplateState';
import { useFieldExtensions } from '../../hooks/useFieldExtensions';
import { yamlToState } from '../../utils/templateSerializer';
import type { AvailableAction } from '../../types';

export function TemplateBuilderPage() {
  const { namespace, kind, name } = useParams<{ namespace?: string; kind?: string; name?: string }>();
  const api = useApi(templateBuilderApiRef);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  
  const { state, actions, canUndo, canRedo } = useTemplateState();
  const { extensions: fieldExtensions, loading: extensionsLoading, error: extensionsError } = useFieldExtensions();

  // Load template if editing existing one
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(undefined);

      try {
        // Load available actions
        const actionsData = await api.getAvailableActions();
        const formattedActions: AvailableAction[] = actionsData.map(action => ({
          id: action.id,
          name: action.description || action.id,
          description: action.description,
          category: getCategoryFromActionId(action.id),
          schema: action.schema,
        }));
        setAvailableActions(formattedActions);

        // Load existing template if editing
        if (namespace && kind && name) {
          const entityRef = `${kind}:${namespace}/${name}`;
          const templateYaml = await api.getTemplate(entityRef);
          const templateState = yamlToState(templateYaml);
          actions.setState(templateState);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [namespace, kind, name, api, actions]);

  if (loading || extensionsLoading) {
    return <Progress />;
  }

  if (error || extensionsError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          <Typography variant="h6">Error</Typography>
          <Typography variant="body2">{error || extensionsError}</Typography>
        </Alert>
        {extensionsError && (
          <Alert severity="warning" style={{ marginTop: 16 }}>
            <Typography variant="body2">
              Field extensions discovery failed. You can still add custom field types manually.
            </Typography>
          </Alert>
        )}
      </Box>
    );
  }

  return (
      <EditorLayout
        state={state}
        actions={actions}
        canUndo={canUndo}
        canRedo={canRedo}
        availableActions={availableActions}
        fieldExtensions={fieldExtensions}
      />
  );
}

function getCategoryFromActionId(actionId: string): string {
  const categories: Record<string, string> = {
    'fetch:': 'File Operations',
    'fs:': 'File Operations',
    'publish:': 'Git Operations',
    'catalog:': 'Catalog Operations',
    'github:': 'GitHub',
    'gitlab:': 'GitLab',
    'debug:': 'Debugging',
  };

  for (const [prefix, category] of Object.entries(categories)) {
    if (actionId.startsWith(prefix)) {
      return category;
    }
  }

  return 'Other';
}
