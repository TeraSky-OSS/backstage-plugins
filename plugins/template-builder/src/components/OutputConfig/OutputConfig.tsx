import { useState } from 'react';
import {
  Box,
  Button,
  ButtonIcon,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Flex,
  List,
  ListRow,
  Text,
  TextAreaField,
  TextField,
} from '@backstage/ui';
import { RiAddLine, RiDeleteBinLine, RiEditLine } from '@remixicon/react';
import type { OutputLink } from '../../types';

export interface OutputConfigProps {
  links?: OutputLink[];
  onUpdateLinks: (links: OutputLink[]) => void;
}

export function OutputConfig(props: OutputConfigProps) {
  const { links = [], onUpdateLinks } = props;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentLink, setCurrentLink] = useState<OutputLink>({
    title: '',
    url: '',
  });

  const handleAddClick = () => {
    setCurrentLink({ title: '', url: '' });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    setCurrentLink(links[index]);
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const newLinks = [...links];
    if (editingIndex !== null) {
      newLinks[editingIndex] = currentLink;
    } else {
      newLinks.push(currentLink);
    }
    onUpdateLinks(newLinks);
    setDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onUpdateLinks(newLinks);
  };

  const linkItems = links.map((link, index) => ({ ...link, id: index }));

  return (
    <Box style={{ padding: 'var(--bui-space-4)' }}>
      <Box style={{ marginBottom: 'var(--bui-space-6)' }}>
        <Flex justify="between" align="center" style={{ marginBottom: 'var(--bui-space-2)' }}>
          <Text as="p" variant="title-x-small" weight="bold">
            Output Links
          </Text>
          <Button size="small" iconStart={<RiAddLine />} onPress={handleAddClick} variant="secondary">
            Add Link
          </Button>
        </Flex>

        {links.length > 0 ? (
          <List items={linkItems}>
            {link => (
              <ListRow
                key={link.id}
                id={link.id}
                textValue={link.title || 'Untitled Link'}
                description={link.url}
                customActions={
                  <Flex gap="1">
                    <ButtonIcon
                      aria-label="Edit link"
                      icon={<RiEditLine />}
                      size="small"
                      variant="tertiary"
                      onPress={() => handleEditClick(link.id)}
                    />
                    <ButtonIcon
                      aria-label="Delete link"
                      icon={<RiDeleteBinLine />}
                      size="small"
                      variant="tertiary"
                      onPress={() => handleDelete(link.id)}
                    />
                  </Flex>
                }
              >
                {link.title || 'Untitled Link'}
              </ListRow>
            )}
          </List>
        ) : (
          <Box style={{ padding: 'var(--bui-space-6)', textAlign: 'center' }}>
            <Text as="p" variant="body-small" color="secondary">
              No output links configured. Add links to show after template execution.
            </Text>
          </Box>
        )}
      </Box>

      <Dialog isOpen={dialogOpen} onOpenChange={isOpen => !isOpen && setDialogOpen(false)} width="500px">
        <DialogHeader>
          {editingIndex !== null ? 'Edit Output Link' : 'Add Output Link'}
        </DialogHeader>
        <DialogBody>
          <Flex direction="column" gap="4">
            <TextField
              label="Title"
              value={currentLink.title || ''}
              onChange={val => setCurrentLink({ ...currentLink, title: val })}
              placeholder="Repository"
            />
            <TextAreaField
              label="URL"
              value={currentLink.url || ''}
              onChange={val => setCurrentLink({ ...currentLink, url: val })}
              placeholder="${{ steps.publish.output.remoteUrl }}"
              description="Use ${{ }} expressions to reference step outputs"
              rows={2}
            />
            <TextField
              label="Icon (optional)"
              value={currentLink.icon || ''}
              onChange={val => setCurrentLink({ ...currentLink, icon: val })}
              placeholder="github"
            />
          </Flex>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </Box>
  );
}
