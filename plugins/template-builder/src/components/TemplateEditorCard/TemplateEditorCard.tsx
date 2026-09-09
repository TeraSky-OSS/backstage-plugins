import { Button, Card, CardBody, CardHeader, Flex, Text } from '@backstage/ui';
import { RiHammerLine } from '@remixicon/react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useNavigate } from 'react-router-dom';

export function TemplateEditorCard() {
  const { entity } = useEntity();
  const navigate = useNavigate();

  const handleOpenEditor = () => {
    const { namespace = 'default', kind, name } = entity.metadata;
    const kindStr = typeof kind === 'string' ? kind.toLowerCase() : 'template';
    const path = `/template-builder/edit/${namespace}/${kindStr}/${name}`;
    navigate(path);
  };

  return (
    <Card>
      <CardHeader>
        <Text as="p" variant="title-small" weight="bold">
          Visual Template Editor
        </Text>
      </CardHeader>
      <CardBody>
        <Flex direction="column">
          <Text as="p" variant="body-small" color="secondary" style={{ marginBottom: 'var(--bui-space-4)' }}>
            Open this template in the visual editor to modify parameters,
            workflow steps, and see a graphical representation of the template
            structure.
          </Text>
          <Button variant="primary" iconStart={<RiHammerLine />} onPress={handleOpenEditor} style={{ width: '100%' }}>
            Open in Template Builder
          </Button>
        </Flex>
      </CardBody>
    </Card>
  );
}
