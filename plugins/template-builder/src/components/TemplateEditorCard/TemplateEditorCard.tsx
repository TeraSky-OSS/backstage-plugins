import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Box,
} from '@material-ui/core';
import BuildIcon from '@material-ui/icons/Build';
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
      <CardHeader
        title="Visual Template Editor"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Box display="flex" flexDirection="column">
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Open this template in the visual editor to modify parameters,
            workflow steps, and see a graphical representation of the template
            structure.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BuildIcon />}
            onClick={handleOpenEditor}
            fullWidth
          >
            Open in Template Builder
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
