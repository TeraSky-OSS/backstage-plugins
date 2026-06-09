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
  Grid, 
  Typography, 
  Chip, 
  Box, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import EditIcon from '@material-ui/icons/Edit';
import yaml from 'js-yaml';
import useAsync from 'react-use/lib/useAsync';
import { VCFAutomationVMPowerManagement } from './VCFAutomationVMPowerManagement';

const useStyles = makeStyles(theme => ({
  statusChip: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
  },
  conditionChip: {
    margin: theme.spacing(0.25),
  },
  yamlContainer: {
    '& .MuiAccordionSummary-root': {
      minHeight: 48,
    },
  },
  dependencyChip: {
    margin: theme.spacing(0.25),
    cursor: 'pointer',
  },
  editButton: {
    marginTop: theme.spacing(1),
  },
  monacoEditor: {
    flex: 1,
    minHeight: '500px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  validationStatus: {
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    flexShrink: 0,
  },
  dialogContent: {
    padding: theme.spacing(2),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  editorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  },
  yamlValidationError: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(1),
    fontSize: '0.875rem',
  },
}));

export const VCFAutomationCCIResourceOverview = () => {
  const classes = useStyles();
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
        <Typography>No resource data available.</Typography>
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
      <Grid container spacing={3}>
        {isStandalone && (
          <Grid item xs={12}>
            <Box mb={2}>
              <Chip
                label="Standalone Resource"
                color="secondary"
                variant="outlined"
                size="small"
              />
            </Box>
          </Grid>
        )}
        <Grid item xs={12}>
          <Typography variant="h6" className={classes.sectionTitle}>
            Basic Information
          </Typography>
          <StructuredMetadataTable metadata={basicInfo} />
        </Grid>

        {/* VM Power Management for VirtualMachine resources in all-apps organizations */}
        {vmOrganizationType === 'all-apps' && resourceKind === 'VirtualMachine' && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Power Management
            </Typography>
            <VCFAutomationVMPowerManagement
              entity={entity}
              resourceId={resourceId}
              instanceName={instanceName}
              isStandalone={isStandalone}
              vmName={isStandalone ? vmName : undefined}
              namespaceName={isStandalone ? namespaceName : undefined}
              namespaceUrnId={isStandalone ? namespaceUrnId : undefined}
            />
          </Grid>
        )}

        {/* Edit Resource Manifest for VirtualMachine resources with permission */}
        {canEditResource && vmOrganizationType === 'all-apps' && resourceKind === 'VirtualMachine' && resourceName && namespaceName && namespaceUrnId && apiVersion && (
          <Grid item xs={12}>
            <Box mt={vmOrganizationType === 'all-apps' ? 0 : 2}>
              {vmOrganizationType !== 'all-apps' && (
                <Typography variant="h6" className={classes.sectionTitle}>
                  Resource Management
                </Typography>
              )}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleEditResource}
                className={classes.editButton}
                disabled={isLoadingManifest}
              >
                Edit Resource Manifest
              </Button>
            </Box>
          </Grid>
        )}

        {/* Edit Resource Manifest for non-VirtualMachine resources with permission */}
        {canEditResource && (resourceKind !== 'VirtualMachine' || vmOrganizationType !== 'all-apps') && resourceName && namespaceName && namespaceUrnId && apiVersion && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Resource Management
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={handleEditResource}
              className={classes.editButton}
              disabled={isLoadingManifest}
            >
              Edit Resource Manifest
            </Button>
          </Grid>
        )}

        {entity.spec?.dependsOn && Array.isArray(entity.spec.dependsOn) && entity.spec.dependsOn.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Dependencies
            </Typography>
            <Box>
              {entity.spec.dependsOn
                .filter((dep): dep is string => typeof dep === 'string')
                .map((dep: string, index: number) => (
                  <Chip
                    key={index}
                    label={dep}
                    size="small"
                    className={classes.dependencyChip}
                    color="primary"
                    variant="outlined"
                  />
                ))}
            </Box>
          </Grid>
        )}

        {resourceData.wait?.conditions && resourceData.wait.conditions.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Wait Conditions
            </Typography>
            <Box>
              {resourceData.wait.conditions.map((condition: any, index: number) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  {renderStatusIcon(condition.status)}
                  <Chip
                    label={`${condition.type}: ${condition.status}`}
                    size="small"
                    className={classes.conditionChip}
                    color={condition.status === 'True' ? 'primary' : 'default'}
                  />
                </Box>
              ))}
            </Box>
          </Grid>
        )}

        {objectData?.status?.conditions && objectData.status.conditions.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Resource Conditions
            </Typography>
            <Box>
              {objectData.status.conditions.map((condition: any, index: number) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  {renderStatusIcon(condition.status)}
                  <Chip
                    label={`${condition.type}: ${condition.status}`}
                    size="small"
                    className={classes.conditionChip}
                    color={condition.status === 'True' ? 'primary' : 'default'}
                  />
                  <Typography variant="caption" style={{ marginLeft: 8 }}>
                    {condition.lastTransitionTime}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        )}

        {objectStatus && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Resource Status
            </Typography>
            <StructuredMetadataTable metadata={objectStatus} />
          </Grid>
        )}

        {manifest && (
          <Grid item xs={12}>
            <Accordion className={classes.yamlContainer}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="manifest-content"
                id="manifest-header"
              >
                <Typography variant="h6">Resource Manifest</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box width="100%">
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
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {objectData && (
          <Grid item xs={12}>
            <Accordion className={classes.yamlContainer}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="object-content"
                id="object-header"
              >
                <Typography variant="h6">Kubernetes Object</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box width="100%">
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
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>

      {/* YAML Editor Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          style: {
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6">Edit Resource Manifest</Typography>
          <Typography variant="body2" color="textSecondary">
            {resourceName} ({resourceKind})
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent} dividers>
          {isLoadingManifest ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <Progress />
            </Box>
          ) : (
            <Box className={classes.editorContainer}>
              <Typography variant="subtitle2" gutterBottom>
                YAML Editor
              </Typography>
              
              <Box className={classes.monacoEditor}>
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
              <Box className={classes.validationStatus}>
                {yamlValidationError && (
                  <Typography className={classes.yamlValidationError}>
                    ⚠️ YAML Validation Error: {yamlValidationError}
                  </Typography>
                )}
                {!yamlValidationError && editingYaml.trim() && (
                  <Typography variant="caption" color="textSecondary">
                    ✅ YAML syntax is valid
                  </Typography>
                )}
                {!yamlValidationError && !editingYaml.trim() && (
                  <Typography variant="caption" color="textSecondary">
                    Enter YAML content above
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => setConfirmDialogOpen(true)}
            color="primary"
            variant="contained"
            disabled={isLoadingManifest || !editingYaml.trim() || !!yamlValidationError}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Changes</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to apply these changes to the resource? 
            This action will update the Kubernetes resource based on your modifications.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSaveResource}
            color="primary"
            variant="contained"
            disabled={isSaving}
          >
            {isSaving ? 'Applying...' : 'Apply Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </InfoCard>
  );
};