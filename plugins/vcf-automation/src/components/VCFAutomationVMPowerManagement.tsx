import { useState, useCallback, useMemo } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import { VmPowerAction, VmPowerActionType, StandaloneVmStatus } from '../types';
import { Progress } from '@backstage/core-components';
import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Flex,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { RiPlayLine, RiShutDownLine, RiStopLine } from '@remixicon/react';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { vmPowerManagementPermission } from '@terasky/backstage-plugin-vcf-automation-common';

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
      <Flex align="center" gap="2">
        <Progress />
        <Text variant="body-small">Loading power status...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex align="center" gap="2">
        <Text variant="body-small" style={{ color: 'var(--bui-fg-negative)' }}>
          Failed to load power status
        </Text>
      </Flex>
    );
  }

  if (!vmData) {
    return null;
  }

  const canExecuteAction = hasPermission && availableAction && !executing;
  const buttonIcon = availableAction === 'PowerOn' ? <RiPlayLine /> : <RiStopLine />;
  const buttonText = availableAction === 'PowerOn' ? 'Power On' : 'Power Off';
  const actionTitle = !availableAction ? 'No power action available' : `${buttonText} this virtual machine`;
  const buttonTitle = !hasPermission ? 'You do not have permission to manage VM power state' : actionTitle;

  return (
    <>
      <Flex align="center" gap="2">
        <TooltipTrigger>
          <Button
            variant="primary"
            size="small"
            destructive={availableAction === 'PowerOff'}
            iconStart={buttonIcon}
            isDisabled={!canExecuteAction}
            isPending={executing}
            onPress={() => availableAction && handleActionClick(availableAction)}
          >
            {buttonText}
          </Button>
          <Tooltip>{buttonTitle}</Tooltip>
        </TooltipTrigger>

        <Badge style={vmData.powerState === 'PoweredOn' ? { color: 'var(--bui-fg-positive)' } : undefined}>
          <RiShutDownLine style={{ width: '1em', height: '1em', marginRight: 'var(--bui-space-1)' }} />
          {vmData.powerState}
        </Badge>
      </Flex>

      {/* Confirmation Dialog */}
      <Dialog isOpen={confirmDialog.open} onOpenChange={open => !open && handleCancelAction()}>
        <DialogHeader>
          Confirm {confirmDialog.actionDisplayName}
        </DialogHeader>
        <DialogBody>
          <Text>
            Are you sure you want to {confirmDialog.actionDisplayName?.toLowerCase()} this virtual machine?
          </Text>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginTop: 'var(--bui-space-2)' }}>
            VM: {vmName || entity.metadata.name}
          </Text>
          {isStandalone && (
            <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
              Namespace: {namespaceName}
            </Text>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={handleCancelAction}>
            Cancel
          </Button>
          <Button
            variant="primary"
            destructive={confirmDialog.action === 'PowerOff'}
            onPress={handleConfirmAction}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            {confirmDialog.actionDisplayName}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Success/Error feedback */}
      {snackbar.open && (
        <Box style={{ position: 'fixed', bottom: 'var(--bui-space-4)', right: 'var(--bui-space-4)', zIndex: 1300, maxWidth: '400px' }}>
          <Alert
            status={snackbar.severity === 'success' ? 'success' : 'danger'}
            icon
            description={snackbar.message}
            customActions={
              <Button size="small" variant="tertiary" onPress={handleCloseSnackbar}>
                Dismiss
              </Button>
            }
          />
        </Box>
      )}
    </>
  );
};