import { Button } from '@backstage/ui';
import { RiHammerLine } from '@remixicon/react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useNavigate } from 'react-router-dom';

export function EditTemplateAction() {
  const { entity } = useEntity();
  const navigate = useNavigate();

  const handleClick = () => {
    const { namespace = 'default', kind, name } = entity.metadata;
    const kindStr = typeof kind === 'string' ? kind.toLowerCase() : 'template';
    const path = `/template-builder/edit/${namespace}/${kindStr}/${name}`;
    navigate(path);
  };

  // Only show for Template entities
  if (entity.kind !== 'Template') {
    return null;
  }

  return (
    <Button variant="secondary" iconStart={<RiHammerLine />} onPress={handleClick}>
      Edit in Template Builder
    </Button>
  );
}
