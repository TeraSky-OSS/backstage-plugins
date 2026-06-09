import { useState, useCallback, useMemo } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import { VmPowerAction, VmPowerActionType, StandaloneVmStatus } from '../types';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  CircularProgress,
  Snackbar,
  Chip,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import PowerSettingsNewIcon from '@material-ui/icons/PowerSettingsNew';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { vmPowerManagementPermission } from '@terasky/backstage-plugin-vcf-automation-common';

const useStyles = makeStyles(theme => ({
  powerButtons: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
  },
  powerOnButton: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
    '&:disabled': {
      backgroundColor: theme.palette.action.disabled,
      color: theme.palette.action.disabled,
    },
  },
  powerOffButton: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
    '&:disabled': {
      backgroundColor: theme.palette.action.disabled,
      color: theme.palette.action.disabled,
    },
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
}));

// Permission is defined in vcf-automation-common plugin

interface VCFAutomationVMPowerManagementProps {
  entity: any;
  resourceId: string;
  instanceName?: string;
  isStandalone: boolean;
  vmName?: string;
  namespaceName?: string;
  namespaceUrnId?: string;
}

export const VCFAutomationVMPowerManagement: React.FC<VCFAutomationVMPowerManagementProps> = ({
  entity,
  resourceId,
  instanceName,
  isStandalone,
  vmName,
  namespaceName,
  namespaceUrnId,
}) => {
  const classes = useStyles();
  const api = useApi(vcfAutomationApiRef);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: VmPowerActionType | null;
    actionDisplayName?: string;
  }>({
    open: false,
    action: null,
  });
  
  const [executing, setExecuting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Check permissions
  const { allowed: hasPermission } = usePermission({ 
    permission: vmPowerManagementPermission,
  });

  // Get current power state and available actions
  const { value: vmData, loading, error } = useAsync(async () => {
    if (isStandalone) {
      if (!vmName || !namespaceName || !namespaceUrnId) {
        throw new Error('Missing required parameters for standalone VM');
      }
      
      // Get standalone VM status
      const vmStatus: StandaloneVmStatus = await api.getStandaloneVmStatus(namespaceUrnId, namespaceName, vmName, instanceName);
      return {
        powerState: vmStatus.spec.powerState,
        isStandalone: true,
        vmData: vmStatus,
      };
    } 
      // For deployment-managed VMs, check both power actions
      const [powerOnAction, powerOffAction] = await Promise.all([
        api.checkVmPowerAction(resourceId, 'PowerOn', instanceName),
        api.checkVmPowerAction(resourceId, 'PowerOff', instanceName),
      ]);
      
      // Determine current power state based on which action is valid
      const powerState = powerOnAction.valid ? 'PoweredOff' : 'PoweredOn';
      
      return {
        powerState,
        isStandalone: false,
        availableActions: {
          PowerOn: powerOnAction as VmPowerAction,
          PowerOff: powerOffAction as VmPowerAction,
        },
      };
    
  }, [resourceId, instanceName, isStandalone, vmName, namespaceName, namespaceUrnId]);

  // Determine which action is available
  const availableAction = useMemo(() => {
    if (!vmData) return null;
    
    if (isStandalone) {
      return vmData.powerState === 'PoweredOff' ? 'PowerOn' : 'PowerOff';
    } 
      // For deployment-managed VMs, check which action is valid
      const powerOnValid = vmData.availableActions?.PowerOn?.valid;
      const powerOffValid = vmData.availableActions?.PowerOff?.valid;
      
      if (powerOnValid) return 'PowerOn';
      if (powerOffValid) return 'PowerOff';
      return null;
    
  }, [vmData, isStandalone]);

  const handleActionClick = useCallback((action: VmPowerActionType) => {
    if (!hasPermission) return;
    
    const actionDisplayName = action === 'PowerOn' ? 'Power On' : 'Power Off';
    setConfirmDialog({
      open: true,
      action,
      actionDisplayName,
    });
  }, [hasPermission]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog.action || !vmData) return;
    
    setExecuting(true);
    setConfirmDialog({ open: false, action: null });
    
    try {
      if (isStandalone) {
        if (!vmName || !namespaceName || !namespaceUrnId) {
          throw new Error('Missing required parameters for standalone VM');
        }
        
        const newPowerState = confirmDialog.action === 'PowerOn' ? 'PoweredOn' : 'PoweredOff';
        await api.executeStandaloneVmPowerAction(namespaceUrnId, namespaceName, vmName, newPowerState, vmData.vmData, instanceName);
      } else {
        await api.executeVmPowerAction(resourceId, confirmDialog.action, instanceName);
      }
      
      setSnackbar({
        open: true,
        message: `Successfully executed ${confirmDialog.action} action`,
        severity: 'success',
      });
      
      // Refresh the data
      setTimeout(() => window.location.reload(), 1000); // Wait a bit for the action to take effect
    } catch (caughtError) {
      setSnackbar({
        open: true,
        message: `Failed to execute ${confirmDialog.action} action: ${caughtError instanceof Error ? caughtError.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setExecuting(false);
    }
  }, [confirmDialog.action, vmData, isStandalone, vmName, namespaceName, namespaceUrnId, api, instanceName, resourceId]);

  const handleCancelAction = useCallback(() => {
    setConfirmDialog({ open: false, action: null });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  if (loading) {
    return (
      <Box className={classes.powerButtons}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading power status...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={classes.powerButtons}>
        <Typography variant="body2" color="error">
          Failed to load power status
        </Typography>
      </Box>
    );
  }

  if (!vmData) {
    return null;
  }

  const canExecuteAction = hasPermission && availableAction && !executing;
  const buttonIcon = availableAction === 'PowerOn' ? <PlayArrowIcon /> : <StopIcon />;
  const buttonClass = availableAction === 'PowerOn' ? classes.powerOnButton : classes.powerOffButton;
  const buttonText = availableAction === 'PowerOn' ? 'Power On' : 'Power Off';
  const actionTitle = !availableAction ? 'No power action available' : `${buttonText} this virtual machine`;
  const buttonTitle = !hasPermission ? 'You do not have permission to manage VM power state' : actionTitle;

  return (
    <>
      <Box className={classes.powerButtons}>
        <Button
          variant="contained"
          size="small"
          startIcon={buttonIcon}
          className={buttonClass}
          disabled={!canExecuteAction}
          onClick={() => availableAction && handleActionClick(availableAction)}
          title={buttonTitle}
        >
          {executing ? <CircularProgress size={16} color="inherit" /> : buttonText}
        </Button>
        
        <Chip
          label={vmData.powerState}
          size="small"
          className={classes.statusChip}
          color={vmData.powerState === 'PoweredOn' ? 'primary' : 'default'}
          icon={<PowerSettingsNewIcon />}
        />
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelAction}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm {confirmDialog.actionDisplayName}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {confirmDialog.actionDisplayName?.toLowerCase()} this virtual machine?
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
            VM: {vmName || entity.metadata.name}
          </Typography>
          {isStandalone && (
            <Typography variant="body2" color="textSecondary">
              Namespace: {namespaceName}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAction} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            color="primary" 
            variant="contained"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            {confirmDialog.actionDisplayName}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};