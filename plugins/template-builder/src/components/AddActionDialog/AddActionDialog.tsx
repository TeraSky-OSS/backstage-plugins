import { useState, useMemo } from 'react';
import { Badge, Box, Dialog, DialogBody, DialogHeader, Flex, List, ListRow, Text, TextField } from '@backstage/ui';
import { RiSearchLine } from '@remixicon/react';
import type { AvailableAction } from '../../types';

export interface AddActionDialogProps {
  open: boolean;
  actions: AvailableAction[];
  onClose: () => void;
  onSelectAction: (action: AvailableAction) => void;
}

export function AddActionDialog(props: AddActionDialogProps) {
  const { open, actions, onClose, onSelectAction } = props;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActions = useMemo(() => {
    if (!searchQuery) return actions;

    const query = searchQuery.toLowerCase();
    return actions.filter(
      action =>
        action.name.toLowerCase().includes(query) ||
        action.id.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query) ||
        action.category?.toLowerCase().includes(query)
    );
  }, [actions, searchQuery]);

  const handleSelect = (action: AvailableAction) => {
    onSelectAction(action);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog isOpen={open} onOpenChange={isOpen => !isOpen && handleClose()} width="800px" height="500px">
      <DialogHeader>Add Workflow Step</DialogHeader>
      <DialogBody style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <Box
          style={{
            padding: 'var(--bui-space-4)',
            borderBottom: '1px solid var(--bui-border-1)',
          }}
        >
          <TextField
            placeholder="Search actions..."
            value={searchQuery}
            onChange={setSearchQuery}
            size="small"
            icon={<RiSearchLine />}
          />
        </Box>

        <Box style={{ flex: 1, overflow: 'auto' }}>
          {filteredActions.length > 0 ? (
            <List items={filteredActions}>
              {action => (
                <ListRow
                  key={action.id}
                  id={action.id}
                  textValue={action.name}
                  description={action.description || action.id}
                  onAction={() => handleSelect(action)}
                >
                  <Flex align="center" gap="2">
                    <Text as="span">{action.name}</Text>
                    {action.category && <Badge size="small">{action.category}</Badge>}
                  </Flex>
                </ListRow>
              )}
            </List>
          ) : (
            <Box style={{ padding: 'var(--bui-space-6)', textAlign: 'center' }}>
              <Text as="p" variant="body-small" color="secondary">
                No actions found matching "{searchQuery}"
              </Text>
            </Box>
          )}
        </Box>
      </DialogBody>
    </Dialog>
  );
}
