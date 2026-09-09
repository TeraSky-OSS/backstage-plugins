import { useState } from 'react';
import { Box, Button, ButtonIcon, Flex, Text, TextAreaField, TextField } from '@backstage/ui';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';

interface ClusterConfigurationProps {
  clusterName: string;
  clusterDescription?: string;
  clusterTags: string[];
  clusterVariables: Record<string, any>;
  onUpdate: (updates: {
    clusterName?: string;
    clusterDescription?: string;
    clusterTags?: string[];
    clusterVariables?: Record<string, any>;
  }) => void;
}

export const ClusterConfiguration = ({
  clusterName,
  clusterDescription,
  clusterTags,
  onUpdate,
}: ClusterConfigurationProps) => {
  const [tags, setTags] = useState<string[]>(clusterTags || []);

  const updateTags = (tagList: string[]) => {
    const filtered = tagList.filter(tag => tag.trim() !== '');
    onUpdate({ clusterTags: filtered });
  };

  const handleAddTag = () => {
    setTags([...tags, '']);
  };

  const handleRemoveTag = (index: number) => {
    const updated = [...tags];
    updated.splice(index, 1);
    setTags(updated);
    updateTags(updated);
  };

  const handleTagChange = (index: number, value: string) => {
    const updated = [...tags];
    updated[index] = value;
    setTags(updated);
    updateTags(updated);
  };

  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Cluster Configuration
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Configure basic cluster settings including name, description, and tags
        </Text>
      </Box>

      <Box mb="4">
        <TextField
          label="Cluster Name"
          value={clusterName}
          onChange={value => onUpdate({ clusterName: value })}
          isRequired
          description="Enter a unique name for your cluster"
        />
      </Box>

      <Box mb="4">
        <TextAreaField
          label="Description (Optional)"
          value={clusterDescription || ''}
          onChange={value => onUpdate({ clusterDescription: value })}
          rows={3}
          description="Enter a description for your cluster"
        />
      </Box>

      <Box mt="6">
        <Text variant="title-small" weight="bold" as="div">
          Tags (Optional)
        </Text>
        <Box mt="1" mb="4">
          <Text variant="body-small" color="secondary">
            Add tags to organize and filter your cluster
          </Text>
        </Box>

        {tags.map((tag, index) => (
          <Flex key={index} align="center" gap="2" mb="2">
            <Box style={{ flexGrow: 1 }}>
              <TextField
                label="Tag Key"
                value={tag}
                onChange={value => handleTagChange(index, value)}
                size="small"
                description="Tag keys will automatically get the value 'spectro__tag'"
              />
            </Box>
            <ButtonIcon
              icon={<RiDeleteBinLine />}
              onPress={() => handleRemoveTag(index)}
              size="small"
              aria-label="Remove tag"
            />
          </Flex>
        ))}

        <Button iconStart={<RiAddLine />} onPress={handleAddTag} size="small">
          Add Tag
        </Button>
      </Box>
    </Box>
  );
};
