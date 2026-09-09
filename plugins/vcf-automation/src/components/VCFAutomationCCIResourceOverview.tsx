import { useMemo, useState, useCallback } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import { supervisorResourceEditPermission } from '@terasky/backstage-plugin-vcf-automation-common';
import Editor from '@monaco-editor/react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  StructuredMetadataTable,
  CodeSnippet,
  StatusOK,
  StatusError,
  StatusPending,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Accordion,
  AccordionTrigger,
  AccordionPanel,
  Flex,
  Grid,
  Text,
} from '@backstage/ui';
import { RiEditLine } from '@remixicon/react';
import yaml from 'js-yaml';
import useAsync from 'react-use/lib/useAsync';
import { VCFAutomationVMPowerManagement } from './VCFAutomationVMPowerManagement';

export const VCFAutomationCCIResourceOverview = () => {
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);
  const catalogApi = useApi(catalogApiRef);

  // Permission check for supervisor resource editing
  const { allowed: canEditResource } = usePermission({
    permission: supervisorResourceEditPermission,
  });

  // State for YAML editor modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingYaml, setEditingYaml] = useState('');
  const [originalManifest, setOriginalManifest] = useState<any>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [yamlValidationError, setYamlValidationError] = useState<string>('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Extract stable values from entity
  const deploymentId = entity.spec?.system as string;
  const resourceId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  // Check if this is a standalone resource
  const isStandalone = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-origin'] === 'STANDALONE';
  
  // Get VM organization type from entity tags
  const vmOrganizationType = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-version'] === '9' && 
    entity.metadata.tags?.some((tag: string) => tag.startsWith('vcf-automation:')) ? 'all-apps' : 'vm-apps';

  // Parse annotation data once using useMemo
  const annotationData = useMemo(() => {
    const resourceProperties = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-properties'];
    const resourceManifest = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-resource-manifest'];
    const resourceObject = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-resource-object'];
    const resourceContext = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-resource-context'];
    
    return {
      resourceData: resourceProperties && resourceProperties !== '{}' ? JSON.parse(resourceProperties) : null,
      manifest: resourceManifest && resourceManifest !== '{}' ? JSON.parse(resourceManifest) : null,
      objectData: resourceObject && resourceObject !== '{}' ? JSON.parse(resourceObject) : null,
      resourceContext: resourceContext || '',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.metadata.annotations]);

  // Check if we need to make API call
  const needsApiCall = !annotationData.resourceData || !annotationData.manifest || !annotationData.objectData;

  // Fallback API call if annotation data is missing or empty
  const { value: apiResourceData, loading, error } = useAsync(async () => {
    if (!needsApiCall || !resourceId) {
      return null;
    }

    try {
      if (isStandalone) {
        // For standalone resources, fetch directly by resource ID
        const response = await api.getSupervisorResource(resourceId, instanceName);
        if (response) {
          // Transform standalone resource data to match expected structure
          return {
            id: response.id,
            properties: {
              manifest: {
                apiVersion: response.apiVersion,
                kind: response.kind,
                metadata: response.metadata,
                spec: response.spec,
              },
              object: {
                apiVersion: response.apiVersion,
                kind: response.kind,
                metadata: response.metadata,
                spec: response.spec,
                status: response.status,
              },
              context: JSON.stringify({
                namespace: response.metadata.namespace,
                apiVersion: response.apiVersion,
                kind: response.kind,
                standalone: true,
              }),
            },
          };
        }
      } else {
        // For deployment-managed resources, use existing logic
        if (!deploymentId) {
          return null;
        }
        
        const response = await api.getDeploymentResources(deploymentId, instanceName);
        let resources = null;
        if (response) {
          // Handle both direct array and paginated response with content wrapper
          if (Array.isArray(response)) {
            resources = response;
          } else if (response.content && Array.isArray(response.content)) {
            resources = response.content;
          }
        }
        if (resources) {
          return resources.find((r: any) => r.id === resourceId);
        }
      }
      return null;
    } catch (apiError) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch resource data:', apiError);
      return null;
    }
  }, [needsApiCall, isStandalone, deploymentId, resourceId, instanceName]);

  // Determine final data to use
  const resourceData = annotationData.resourceData || apiResourceData;
  const manifest = annotationData.manifest || apiResourceData?.properties?.manifest;
  const objectData = annotationData.objectData || apiResourceData?.properties?.object;
  const resourceContext = annotationData.resourceContext || apiResourceData?.properties?.context;

  // Extract resource-specific information
  const resourceKind = manifest?.kind || objectData?.kind;
  const resourceName = manifest?.metadata?.name || objectData?.metadata?.name;
  const namespaceName = manifest?.metadata?.namespace || objectData?.metadata?.namespace;
  const apiVersion = manifest?.apiVersion || objectData?.apiVersion;
  
  // For backward compatibility, keep vmName for power management
  const vmName = resourceName;
  
  // Helper function to extract namespace URN ID from CCI namespace endpoint annotation
  const extractNamespaceUrnId = useCallback((endpoint: string): string | undefined => {
    // Parse: https://polo-vra.terasky.local/proxy/k8s/namespaces/urn:vcloud:namespace:0a354079-dfe4-4bf9-bce0-4fd87fbffc25
    const match = endpoint.match(/\/namespaces\/(urn:vcloud:namespace:[^\/]+)/);
    return match ? match[1] : undefined;
  }, []);

  // Recursive function to find CCI Supervisor Namespace parent component (up to 3 levels deep)
  const findCCINamespaceParent = useCallback(async (currentEntity: any, depth = 0): Promise<string | undefined> => {
    if (depth >= 3) return undefined; // Max 3 levels deep
    
    // Check if current entity is a CCI Supervisor Namespace
    if (currentEntity.spec?.type === 'CCI.Supervisor.Namespace') {
      const endpoint = currentEntity.metadata?.annotations?.['terasky.backstage.io/vcf-automation-cci-namespace-endpoint'];
      if (endpoint) {
        return extractNamespaceUrnId(endpoint);
      }
    }
    
    // Look for parent component
    const parentRef = currentEntity.spec?.subcomponentOf;
    if (!parentRef) return undefined;
    
    try {
      // Get parent entity from catalog
      const parentEntity = await catalogApi.getEntityByRef(parentRef);
      if (parentEntity) {
        return await findCCINamespaceParent(parentEntity, depth + 1);
      }
    } catch (caughtError) {
      // eslint-disable-next-line no-console
      console.warn('Failed to fetch parent entity:', parentRef, caughtError);
    }
    
    return undefined;
  }, [catalogApi, extractNamespaceUrnId]);

  // For CCI resources, we need the namespace URN ID from the supervisor namespace
  // For standalone: stored in resource context, for deployment-managed: found via parent component hierarchy
  const { value: namespaceUrnId } = useAsync(async () => {
    if (!namespaceName) return undefined;
    
    if (isStandalone) {
      // For standalone resources, try to extract from resource context
      let contextData = null;
      try {
        contextData = typeof resourceContext === 'string' ? JSON.parse(resourceContext || '{}') : resourceContext;
      } catch (caughtError) {
        // eslint-disable-next-line no-console
        console.log('Debug - Resource context is not JSON, treating as string:', resourceContext);
        contextData = null;
      }
      
      const urnId = contextData?.namespaceUrnId || namespaceName;
      // eslint-disable-next-line no-console
      console.log('Debug - Standalone CCI Resource URN ID resolution:', {
        namespaceName,
        resourceContext,
        contextData,
        urnId,
      });
      
      return urnId;
    } 
      // For deployment-managed resources, traverse parent hierarchy to find CCI Supervisor Namespace
      // eslint-disable-next-line no-console
      console.log('Debug - Looking for CCI Supervisor Namespace parent for deployment-managed resource');
      const urnId = await findCCINamespaceParent(entity);
      
      // eslint-disable-next-line no-console
      console.log('Debug - Deployment-managed CCI Resource URN ID resolution:', {
        namespaceName,
        urnId,
        entityRef: entity.metadata.name,
      });
      
      return urnId || namespaceName; // Fallback to namespace name if not found
    
  }, [namespaceName, resourceContext, isStandalone, entity, findCCINamespaceParent]);

  // Handle edit resource manifest action
  const handleEditResource = useCallback(async () => {
    if (!canEditResource || !namespaceName || !resourceName || !namespaceUrnId || !apiVersion || !resourceKind) {
      return;
    }

    setIsLoadingManifest(true);
    setEditModalOpen(true);

    try {
      const manifestResponse = await api.getSupervisorResourceManifest(
        namespaceUrnId,
        namespaceName,
        resourceName,
        apiVersion,
        resourceKind,
        instanceName
      );

      setOriginalManifest(manifestResponse);
      const yamlContent = yaml.dump(manifestResponse, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });
      setEditingYaml(yamlContent);
      setYamlValidationError(''); // Reset validation error
    } catch (caughtError) {
      setSnackbar({
        open: true,
        message: `Failed to fetch resource manifest: ${caughtError instanceof Error ? caughtError.message : 'Unknown error'}`,
        severity: 'error',
      });
      setEditModalOpen(false);
    } finally {
      setIsLoadingManifest(false);
    }
  }, [canEditResource, namespaceName, resourceName, namespaceUrnId, apiVersion, resourceKind, instanceName, api]);

  const handleSaveResource = useCallback(async () => {
    if (!originalManifest || !namespaceName || !resourceName || !namespaceUrnId || !apiVersion || !resourceKind) {
      return;
    }

    setIsSaving(true);
    setConfirmDialogOpen(false);

    try {
      // Parse the edited YAML back to JSON
      const updatedManifest = yaml.load(editingYaml);
      
      await api.updateSupervisorResourceManifest(
        namespaceUrnId,
        namespaceName,
        resourceName,
        apiVersion,
        resourceKind,
        updatedManifest,
        instanceName
      );

      setSnackbar({
        open: true,
        message: 'Resource manifest updated successfully',
        severity: 'success',
      });

      setEditModalOpen(false);

      // Refresh the page after a brief delay
      setTimeout(() => window.location.reload(), 1000);
    } catch (caughtError) {
      setSnackbar({
        open: true,
        message: `Failed to update resource manifest: ${caughtError instanceof Error ? caughtError.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [originalManifest, namespaceName, resourceName, namespaceUrnId, apiVersion, resourceKind, editingYaml, instanceName, api]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // YAML validation function
  const validateYaml = useCallback((yamlString: string) => {
    try {
      yaml.load(yamlString);
      setYamlValidationError('');
      return true;
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : 'Invalid YAML syntax';
      setYamlValidationError(errorMessage);
      return false;
    }
  }, []);

  // Handle YAML editor changes with validation
  const handleYamlChange = useCallback((value: string) => {
    setEditingYaml(value);
    if (value.trim()) {
      validateYaml(value);
    } else {
      setYamlValidationError('');
    }
  }, [validateYaml]);

  if (loading) {
    return (
      <InfoCard title="CCI Supervisor Resource">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!resourceData) {
    return (
      <InfoCard title="CCI Supervisor Resource">
        <Text>No resource data available.</Text>
      </InfoCard>
    );
  }

  const renderStatusIcon = (conditionStatus: string) => {
    switch (conditionStatus.toLowerCase()) {
      case 'true':
        return <StatusOK />;
      case 'false':
        return <StatusError />;
      default:
        return <StatusPending />;
    }
  };

  const reorderKubernetesResource = (data: any) => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Standard Kubernetes resource field order
    const orderedFields = ['apiVersion', 'kind', 'metadata', 'spec', 'status', 'data'];
    const reordered: any = {};

    // Add fields in the correct order
    orderedFields.forEach(field => {
      if (data[field] !== undefined) {
        reordered[field] = data[field];
      }
    });

    // Add any remaining fields that weren't in our standard list
    Object.keys(data).forEach(field => {
      if (!orderedFields.includes(field)) {
        reordered[field] = data[field];
      }
    });

    return reordered;
  };

  const formatYaml = (data: any) => {
    try {
      const reorderedData = reorderKubernetesResource(data);
      return yaml.dump(reorderedData, { 
        indent: 2, 
        lineWidth: -1,
        noRefs: true,
        sortKeys: false 
      });
    } catch (caughtError) {
      return JSON.stringify(data, null, 2);
    }
  };

  const basicInfo = {
    'Resource Name': resourceData.id || 'Unknown',
    'Context': resourceContext || 'Unknown',
    'Resource Link': resourceData.resourceLink || 'Not available',
    'Count': resourceData.count?.toString() || 'N/A',
    'Count Index': resourceData.countIndex?.toString() || 'N/A',
    'Existing': resourceData.existing ? 'Yes' : 'No',
  };

  const getObjectStatus = () => {
    if (!objectData?.status) return null;
    
    const status = objectData.status;
    const statusInfo: any = {};
    
    if (status.powerState) statusInfo['Power State'] = status.powerState;
    if (status.phase) statusInfo.Phase = status.phase;
    if (status.primaryIP4) statusInfo['Primary IP'] = status.primaryIP4;
    if (status.host) statusInfo.Host = status.host;
    if (status.zone) statusInfo.Zone = status.zone;
    if (status.uniqueID) statusInfo['Unique ID'] = status.uniqueID;
    if (status.instanceUUID) statusInfo['Instance UUID'] = status.instanceUUID;
    if (status.biosUUID) statusInfo['BIOS UUID'] = status.biosUUID;
    
    return Object.keys(statusInfo).length > 0 ? statusInfo : null;
  };

  const objectStatus = getObjectStatus();

  return (
    <InfoCard title="CCI Supervisor Resource Overview">
      <Grid.Root columns="12" gap="5">
        {isStandalone && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Badge>Standalone Resource</Badge>
            </Box>
          </Grid.Item>
        )}
        <Grid.Item colSpan="12">
          <Box mb="4">
            <Text variant="title-small" weight="bold">Basic Information</Text>
          </Box>
          <StructuredMetadataTable metadata={basicInfo} />
        </Grid.Item>

        {/* VM Power Management for VirtualMachine resources in all-apps organizations */}
        {vmOrganizationType === 'all-apps' && resourceKind === 'VirtualMachine' && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Power Management</Text>
            </Box>
            <VCFAutomationVMPowerManagement
              entity={entity}
              resourceId={resourceId}
              instanceName={instanceName}
              isStandalone={isStandalone}
              vmName={isStandalone ? vmName : undefined}
              namespaceName={isStandalone ? namespaceName : undefined}
              namespaceUrnId={isStandalone ? namespaceUrnId : undefined}
            />
          </Grid.Item>
        )}

        {/* Edit Resource Manifest for VirtualMachine resources with permission */}
        {canEditResource && vmOrganizationType === 'all-apps' && resourceKind === 'VirtualMachine' && resourceName && namespaceName && namespaceUrnId && apiVersion && (
          <Grid.Item colSpan="12">
            <Box mt={vmOrganizationType === 'all-apps' ? undefined : '4'}>
              {vmOrganizationType !== 'all-apps' && (
                <Box mb="4">
                  <Text variant="title-small" weight="bold">Resource Management</Text>
                </Box>
              )}
              <Button
                variant="secondary"
                iconStart={<RiEditLine />}
                onPress={handleEditResource}
                isDisabled={isLoadingManifest}
              >
                Edit Resource Manifest
              </Button>
            </Box>
          </Grid.Item>
        )}

        {/* Edit Resource Manifest for non-VirtualMachine resources with permission */}
        {canEditResource && (resourceKind !== 'VirtualMachine' || vmOrganizationType !== 'all-apps') && resourceName && namespaceName && namespaceUrnId && apiVersion && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Resource Management</Text>
            </Box>
            <Button
              variant="secondary"
              iconStart={<RiEditLine />}
              onPress={handleEditResource}
              isDisabled={isLoadingManifest}
            >
              Edit Resource Manifest
            </Button>
          </Grid.Item>
        )}

        {entity.spec?.dependsOn && Array.isArray(entity.spec.dependsOn) && entity.spec.dependsOn.length > 0 && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Dependencies</Text>
            </Box>
            <Flex gap="1" style={{ flexWrap: 'wrap' }}>
              {entity.spec.dependsOn
                .filter((dep): dep is string => typeof dep === 'string')
                .map((dep: string, index: number) => (
                  <Badge key={index}>{dep}</Badge>
                ))}
            </Flex>
          </Grid.Item>
        )}

        {resourceData.wait?.conditions && resourceData.wait.conditions.length > 0 && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Wait Conditions</Text>
            </Box>
            <Box>
              {resourceData.wait.conditions.map((condition: any, index: number) => (
                <Flex key={index} align="center" gap="2" mb="2">
                  {renderStatusIcon(condition.status)}
                  <Badge style={condition.status === 'True' ? { color: 'var(--bui-fg-positive)' } : undefined}>
                    {`${condition.type}: ${condition.status}`}
                  </Badge>
                </Flex>
              ))}
            </Box>
          </Grid.Item>
        )}

        {objectData?.status?.conditions && objectData.status.conditions.length > 0 && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Resource Conditions</Text>
            </Box>
            <Box>
              {objectData.status.conditions.map((condition: any, index: number) => (
                <Flex key={index} align="center" gap="2" mb="2">
                  {renderStatusIcon(condition.status)}
                  <Badge style={condition.status === 'True' ? { color: 'var(--bui-fg-positive)' } : undefined}>
                    {`${condition.type}: ${condition.status}`}
                  </Badge>
                  <Text variant="body-small">
                    {condition.lastTransitionTime}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Grid.Item>
        )}

        {objectStatus && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Resource Status</Text>
            </Box>
            <StructuredMetadataTable metadata={objectStatus} />
          </Grid.Item>
        )}

        {manifest && (
          <Grid.Item colSpan="12">
            <Accordion>
              <AccordionTrigger>
                <Text variant="title-small" weight="bold">Resource Manifest</Text>
              </AccordionTrigger>
              <AccordionPanel>
                <Box style={{ width: '100%' }}>
                  <CodeSnippet
                    text={formatYaml(manifest)}
                    language="yaml"
                    showLineNumbers
                    customStyle={{
                      fontSize: '12px',
                      maxHeight: '500px',
                      overflow: 'auto'
                    }}
                  />
                </Box>
              </AccordionPanel>
            </Accordion>
          </Grid.Item>
        )}

        {objectData && (
          <Grid.Item colSpan="12">
            <Accordion>
              <AccordionTrigger>
                <Text variant="title-small" weight="bold">Kubernetes Object</Text>
              </AccordionTrigger>
              <AccordionPanel>
                <Box style={{ width: '100%' }}>
                  <CodeSnippet
                    text={formatYaml(objectData)}
                    language="yaml"
                    showLineNumbers
                    customStyle={{
                      fontSize: '12px',
                      maxHeight: '500px',
                      overflow: 'auto'
                    }}
                  />
                </Box>
              </AccordionPanel>
            </Accordion>
          </Grid.Item>
        )}
      </Grid.Root>

      {/* YAML Editor Modal */}
      <Dialog isOpen={editModalOpen} onOpenChange={open => !open && setEditModalOpen(false)} width="90vw" height="90vh">
        <DialogHeader>
          <Text variant="title-small" weight="bold" style={{ display: 'block' }}>Edit Resource Manifest</Text>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
            {resourceName} ({resourceKind})
          </Text>
        </DialogHeader>
        <DialogBody style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoadingManifest ? (
            <Flex align="center" justify="center" style={{ flex: 1 }}>
              <Progress />
            </Flex>
          ) : (
            <Flex direction="column" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} gap="2">
              <Text variant="body-small" weight="bold" style={{ display: 'block' }}>
                YAML Editor
              </Text>

              <Box style={{ flex: 1, minHeight: '500px', border: '1px solid var(--bui-border-1)', borderRadius: 'var(--bui-radius-2)' }}>
                <Editor
                  height="100%"
                  defaultLanguage="yaml"
                  value={editingYaml}
                  onChange={(value) => handleYamlChange(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'off',
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    folding: true,
                    renderWhitespace: 'selection',
                  }}
                />
              </Box>

              {/* Fixed Validation Status Bar */}
              <Box style={{ padding: 'var(--bui-space-2)', borderTop: '1px solid var(--bui-border-1)', backgroundColor: 'var(--bui-bg-neutral-1)', flexShrink: 0 }}>
                {yamlValidationError && (
                  <Text style={{ color: 'var(--bui-fg-negative)', display: 'block' }}>
                    ⚠️ YAML Validation Error: {yamlValidationError}
                  </Text>
                )}
                {!yamlValidationError && editingYaml.trim() && (
                  <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
                    ✅ YAML syntax is valid
                  </Text>
                )}
                {!yamlValidationError && !editingYaml.trim() && (
                  <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
                    Enter YAML content above
                  </Text>
                )}
              </Box>
            </Flex>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={() => setEditModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={() => setConfirmDialogOpen(true)}
            isDisabled={isLoadingManifest || !editingYaml.trim() || !!yamlValidationError}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog isOpen={confirmDialogOpen} onOpenChange={open => !open && setConfirmDialogOpen(false)}>
        <DialogHeader>Confirm Changes</DialogHeader>
        <DialogBody>
          <Text>
            Are you sure you want to apply these changes to the resource?
            This action will update the Kubernetes resource based on your modifications.
          </Text>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSaveResource}
            isDisabled={isSaving}
          >
            {isSaving ? 'Applying...' : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Notification banner */}
      {snackbar.open && (
        <Box style={{ position: 'fixed', bottom: 'var(--bui-space-4)', left: 'var(--bui-space-4)', zIndex: 1300, maxWidth: '400px' }}>
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
    </InfoCard>
  );
};