import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Box,
  Card,
  Flex,
  Text,
  TextField,
} from '@backstage/ui';
import { RiSearchLine } from '@remixicon/react';
import type { AvailableAction } from '../../types';
import styles from './ActionPalette.module.css';

export interface ActionPaletteProps {
  actions: AvailableAction[];
  onActionDragStart: (action: AvailableAction) => void;
}

export function ActionPalette(props: ActionPaletteProps) {
  const { actions, onActionDragStart } = props;
  const [searchQuery, setSearchQuery] = useState('');

  const categorizedActions = useMemo(() => {
    const filtered = actions.filter(
      action =>
        action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = new Map<string, AvailableAction[]>();

    filtered.forEach(action => {
      const category = action.category || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(action);
    });

    return Array.from(categories.entries()).map(([name, categoryActions]) => ({
      name,
      actions: categoryActions,
    }));
  }, [actions, searchQuery]);

  const handleDragStart = (action: AvailableAction) => (event: React.DragEvent) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(action));
    onActionDragStart(action);
  };

  return (
    <Card className={styles.root}>
      <Box className={styles.header}>
        <Text variant="title-x-small" as="h2">
          Actions
        </Text>
        <Box className={styles.searchBox} mt="2">
          <TextField
            size="small"
            placeholder="Search actions..."
            icon={<RiSearchLine />}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </Box>
        <Text variant="body-x-small" color="secondary">
          Drag actions to the canvas
        </Text>
      </Box>

      <Box className={styles.content}>
        {categorizedActions.length > 0 ? (
          categorizedActions.map(category => (
            <Accordion key={category.name} defaultExpanded>
              <AccordionTrigger>
                <Flex align="center" gap="2">
                  <Text variant="body-small" weight="bold">
                    {category.name}
                  </Text>
                  <Badge>{category.actions.length}</Badge>
                </Flex>
              </AccordionTrigger>
              <AccordionPanel>
                <Flex direction="column" gap="0.5">
                  {category.actions.map(action => (
                    <Box
                      key={action.id}
                      className={styles.listItem}
                      draggable
                      onDragStart={handleDragStart(action)}
                    >
                      <Text variant="body-small" truncate as="div">
                        {action.name}
                      </Text>
                      <Text variant="body-x-small" color="secondary" truncate as="div">
                        {action.id}
                      </Text>
                    </Box>
                  ))}
                </Flex>
              </AccordionPanel>
            </Accordion>
          ))
        ) : (
          <Box className={styles.emptyState}>
            <Text variant="body-small">
              {searchQuery ? 'No actions found' : 'Loading actions...'}
            </Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}
