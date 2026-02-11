import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import WarningIcon from '@material-ui/icons/Warning';
import type { ValidationError } from '../../api/types';

export interface ValidateButtonProps {
  onValidate: () => ValidationError[];
}

export function ValidateButton(props: ValidateButtonProps) {
  const { onValidate } = props;
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleValidate = () => {
    const validationErrors = onValidate();
    setErrors(validationErrors);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CheckCircleIcon />}
        onClick={handleValidate}
      >
        Validate
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {errors.length === 0 ? 'Validation Passed' : 'Validation Results'}
        </DialogTitle>
        <DialogContent>
          {errors.length === 0 ? (
            <Typography variant="body1" color="primary">
              Template is valid! No errors found.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" gutterBottom>
                Found {errorCount} error(s) and {warningCount} warning(s)
              </Typography>
              <List>
                {errors.map((error, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {error.severity === 'error' ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <WarningIcon style={{ color: '#ff9800' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={error.message}
                      secondary={error.path}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
