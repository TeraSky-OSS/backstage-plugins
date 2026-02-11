import { Button } from '@material-ui/core';
import BuildIcon from '@material-ui/icons/Build';
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
    <Button
      variant="outlined"
      color="primary"
      startIcon={<BuildIcon />}
      onClick={handleClick}
    >
      Edit in Template Builder
    </Button>
  );
}
