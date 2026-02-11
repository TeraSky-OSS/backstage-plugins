import {
  Box,
  TextField,
  Button,
  IconButton,
  Toolbar as MuiToolbar,
  Tooltip,
  Chip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import DownloadIcon from '@material-ui/icons/GetApp';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import HelpIcon from '@material-ui/icons/Help';
import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';

const useStyles = makeStyles(theme => ({
  toolbar: {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(2),
    padding: theme.spacing(1, 2),
  },
  nameField: {
    minWidth: 250,
  },
  spacer: {
    flex: 1,
  },
}));

export interface ToolbarProps {
  templateName: string;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNameChange: (name: string) => void;
  onDownload: () => void;
  onValidate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onHelp: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const {
    templateName,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    onNameChange,
    onDownload,
    onValidate,
    onUndo,
    onRedo,
    onHelp,
  } = props;

  const classes = useStyles();

  return (
    <MuiToolbar className={classes.toolbar} variant="dense">
      <TextField
        className={classes.nameField}
        label="Template Name"
        value={templateName}
        onChange={e => onNameChange(e.target.value)}
        variant="outlined"
        size="small"
      />

      {hasUnsavedChanges && (
        <Chip
          label="Unsaved Changes"
          size="small"
          color="secondary"
        />
      )}

      <Box className={classes.spacer} />

      <Tooltip title="Undo">
        <span>
          <IconButton
            size="small"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Redo">
        <span>
          <IconButton
            size="small"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <RedoIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Button
        variant="outlined"
        startIcon={<CheckCircleIcon />}
        onClick={onValidate}
        size="small"
      >
        Validate
      </Button>

      <Button
        variant="contained"
        color="primary"
        startIcon={<DownloadIcon />}
        onClick={onDownload}
        size="small"
      >
        Download YAML
      </Button>

      <Tooltip title="Help">
        <IconButton size="small" onClick={onHelp}>
          <HelpIcon />
        </IconButton>
      </Tooltip>
    </MuiToolbar>
  );
}
