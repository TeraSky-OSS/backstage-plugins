import {
  Badge,
  Box,
  Button,
  ButtonIcon,
  Flex,
  TextField,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import {
  RiCheckboxCircleLine,
  RiDownloadLine,
  RiQuestionLine,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
} from '@remixicon/react';

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

  return (
    <Flex
      align="center"
      gap="4"
      style={{
        backgroundColor: 'var(--bui-bg-neutral-1)',
        borderBottom: '1px solid var(--bui-border-1)',
        padding: 'var(--bui-space-2) var(--bui-space-4)',
      }}
    >
      <Box style={{ minWidth: 250 }}>
        <TextField
          label="Template Name"
          value={templateName}
          onChange={onNameChange}
          size="small"
        />
      </Box>

      {hasUnsavedChanges && (
        <Badge style={{ color: 'var(--bui-fg-warning)' }}>Unsaved Changes</Badge>
      )}

      <div style={{ flexGrow: 1 }} />

      <TooltipTrigger>
        <ButtonIcon
          aria-label="Undo"
          icon={<RiArrowGoBackLine />}
          size="small"
          onPress={onUndo}
          isDisabled={!canUndo}
        />
        <Tooltip>Undo</Tooltip>
      </TooltipTrigger>

      <TooltipTrigger>
        <ButtonIcon
          aria-label="Redo"
          icon={<RiArrowGoForwardLine />}
          size="small"
          onPress={onRedo}
          isDisabled={!canRedo}
        />
        <Tooltip>Redo</Tooltip>
      </TooltipTrigger>

      <Button
        variant="secondary"
        iconStart={<RiCheckboxCircleLine />}
        onPress={onValidate}
        size="small"
      >
        Validate
      </Button>

      <Button
        variant="primary"
        iconStart={<RiDownloadLine />}
        onPress={onDownload}
        size="small"
      >
        Download YAML
      </Button>

      <TooltipTrigger>
        <ButtonIcon
          aria-label="Help"
          icon={<RiQuestionLine />}
          size="small"
          onPress={onHelp}
        />
        <Tooltip>Help</Tooltip>
      </TooltipTrigger>
    </Flex>
  );
}
