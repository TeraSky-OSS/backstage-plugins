import { useState, useMemo, useCallback } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { useAsync } from 'react-use';
import Editor from '@monaco-editor/react';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  StructuredMetadataTable,
  StatusOK,
  StatusError,
  StatusPending,
  Table,
  TableColumn,
  CodeSnippet,
} from '@backstage/core-components';
import { 
  Grid, 
  Typography, 
  Chip, 
  Box, 
  Card, 
  CardContent, 
  Tabs, 
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import * as yaml from 'js-yaml';
import { vcfAutomationApiRef } from '../api';
import { supervisorResourceEditPermission } from '@terasky/backstage-plugin-vcf-automation-common';

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
  card: {
    marginBottom: theme.spacing(2),
  },
  statusCard: {
    border: `1px solid ${theme.palette.divider}`,
  },
  dependencyChip: {
    margin: theme.spacing(0.25),
    cursor: 'pointer',
  },
  yamlContainer: {
    '& .MuiAccordionSummary-root': {
      minHeight: 48,
    },
  },
  tabPanel: {
    paddingTop: theme.spacing(2),
  },
  yamlEditorContainer: {
    height: '70vh',
    minHeight: '500px',
    display: 'flex',
    flexDirection: 'column',
  },
  monacoEditor: {
    flex: 1,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  validationStatus: {
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    flexShrink: 0,
  },
  yamlValidationError: {
    color: theme.palette.error.main,
    fontSize: '0.875rem',
  },
  editorActions: {
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    justifyContent: 'flex-end',
  },
}));

interface Condition {
  type: string;
  status: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
}

interface WaitCondition {
  type: string;
  status: string;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index } = props;
  const classes = useStyles();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`resource-tabpanel-${index}`}
      aria-labelledby={`resource-tab-${index}`}
    >
      {value === index && (
        <Box className={classes.tabPanel}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const VCFAutomationCCIResourceDetails = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const [tabValue, setTabValue] = useState(0);
  const api = useApi(vcfAutomationApiRef);
  const catalogApi = useApi(catalogApiRef);

  // Permission check for supervisor resource editing
  const { allowed: canEditResource } = usePermission({
    permission: supervisorResourceEditPermission,
  });

  // State for YAML editor tab
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

  // Parse annotation data once using useMemo
  const annotationData = useMemo(() => {
    const resourceProperties = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-properties'];
    const resourceManifest = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-resource-manifest'];
    const resourceObject = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-resource-object'];
    const resourceContext = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-resource-context'];
    const resourceState = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-state'];
    const syncStatus = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-sync-status'];
    const createdAt = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-created-at'];
    const origin = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-origin'];
    
    return {
      resourceData: resourceProperties && resourceProperties !== '{}' ? JSON.parse(resourceProperties) : null,
      manifest: resourceManifest && resourceManifest !== '{}' ? JSON.parse(resourceManifest) : null,
      objectData: resourceObject && resourceObject !== '{}' ? JSON.parse(resourceObject) : null,
      resourceContext: resourceContext || '',
      resourceState,
      syncStatus,
      createdAt,
      origin,
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
  const resourceState = annotationData.resourceState;
  const syncStatus = annotationData.syncStatus;
  const createdAt = annotationData.createdAt;
  const origin = annotationData.origin;

  // Extract resource-specific information for YAML editor
  const resourceKind = manifest?.kind || objectData?.kind;
  const resourceName = manifest?.metadata?.name || objectData?.metadata?.name;
  const namespaceName = manifest?.metadata?.namespace || objectData?.metadata?.namespace;
  const apiVersion = manifest?.apiVersion || objectData?.apiVersion;
  
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

  // For CCI resources, extract namespace URN ID from context (standalone) or parent hierarchy (deployment-managed)
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
      
      return contextData?.namespaceUrnId || namespaceName;
    } 
      // For deployment-managed resources, traverse parent hierarchy to find CCI Supervisor Namespace
      const urnId = await findCCINamespaceParent(entity);
      return urnId || namespaceName; // Fallback to namespace name if not found
    
  }, [namespaceName, resourceContext, isStandalone, entity, findCCINamespaceParent]);

  // Load manifest for editing
  const loadManifestForEditing = useCallback(async () => {
    if (!canEditResource || !namespaceName || !resourceName || !namespaceUrnId || !apiVersion || !resourceKind) {
      return;
    }

    setIsLoadingManifest(true);

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
      setYamlValidationError('');
    } catch (caughtError) {
      setSnackbar({
        open: true,
        message: `Failed to fetch resource manifest: ${caughtError instanceof Error ? caughtError.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setIsLoadingManifest(false);
    }
  }, [canEditResource, namespaceName, resourceName, namespaceUrnId, apiVersion, resourceKind, instanceName, api]);

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

  // Handle save resource
  const handleSaveResource = useCallback(async () => {
    if (!originalManifest || !namespaceName || !resourceName || !namespaceUrnId || !apiVersion || !resourceKind) {
      return;
    }

    setIsSaving(true);
    setConfirmDialogOpen(false);

    try {
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

  // Handle cancel editing
  const handleCancelEditing = useCallback(() => {
    setEditingYaml('');
    setOriginalManifest(null);
    setYamlValidationError('');
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
    
    // Load manifest when YAML editor tab is selected
    if (newValue === 5 && canEditResource && !editingYaml && !isLoadingManifest) {
      loadManifestForEditing();
    }
  };

  if (loading) {
    return (
      <InfoCard title="CCI Supervisor Resource Details">
        <Typography>Loading resource details...</Typography>
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title="CCI Supervisor Resource Details">
        <Typography color="error">Error loading resource details: {error.message}</Typography>
      </InfoCard>
    );
  }

  if (!resourceData && !manifest && !objectData) {
    return (
      <InfoCard title="CCI Supervisor Resource Details">
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
    'Resource Name': entity.metadata.title || entity.metadata.name,
    'Resource ID': resourceData.id || 'Unknown',
    'Context': resourceContext || 'Unknown',
    'Resource Link': resourceData.resourceLink || 'Not available',
    'Count': resourceData.count?.toString() || 'N/A',
    'Count Index': resourceData.countIndex?.toString() || 'N/A',
    'Existing': resourceData.existing ? 'Yes' : 'No',
    'State': resourceState || 'Unknown',
    'Sync Status': syncStatus || 'Unknown',
    'Origin': origin || 'Unknown',
    'Created At': createdAt ? new Date(createdAt).toLocaleString() : 'Unknown',
  };

  const getManifestInfo = () => {
    if (!manifest) return {};
    
    const info: any = {};
    if (manifest.kind) info.Kind = manifest.kind;
    if (manifest.apiVersion) info['API Version'] = manifest.apiVersion;
    if (manifest.metadata?.name) info['Manifest Name'] = manifest.metadata.name;
    if (manifest.metadata?.namespace) info.Namespace = manifest.metadata.namespace;
    if (manifest.metadata?.labels) {
      const labelCount = Object.keys(manifest.metadata.labels).length;
      info.Labels = `${labelCount} label(s)`;
    }
    if (manifest.metadata?.annotations) {
      const annotationCount = Object.keys(manifest.metadata.annotations).length;
      info.Annotations = `${annotationCount} annotation(s)`;
    }
    
    return info;
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
    if (status.hardwareVersion) statusInfo['Hardware Version'] = status.hardwareVersion;
    if (status.changeBlockTracking !== undefined) statusInfo['Change Block Tracking'] = status.changeBlockTracking ? 'Enabled' : 'Disabled';
    
    return Object.keys(statusInfo).length > 0 ? statusInfo : null;
  };

  const manifestInfo = getManifestInfo();
  const objectStatus = getObjectStatus();

  const waitConditionColumns: TableColumn<WaitCondition>[] = [
    { 
      title: 'Status', 
      field: 'status',
      render: (rowData) => (
        <Box display="flex" alignItems="center">
          {renderStatusIcon(rowData.status)}
          <span style={{ marginLeft: 8 }}>{rowData.status}</span>
        </Box>
      ),
    },
    { title: 'Type', field: 'type' },
  ];

  const resourceConditionColumns: TableColumn<Condition>[] = [
    { 
      title: 'Status', 
      field: 'status',
      render: (rowData) => (
        <Box display="flex" alignItems="center">
          {renderStatusIcon(rowData.status)}
          <span style={{ marginLeft: 8 }}>{rowData.status}</span>
        </Box>
      ),
    },
    { title: 'Type', field: 'type' },
    { title: 'Last Transition', field: 'lastTransitionTime' },
    { title: 'Reason', field: 'reason' },
    { title: 'Message', field: 'message' },
  ];

  const getNetworkInfo = () => {
    if (!objectData?.status?.network) return null;
    
    const network = objectData.status.network;
    const networkInfo: any = {};
    
    if (network.primaryIP4) networkInfo['Primary IPv4'] = network.primaryIP4;
    if (network.interfaces && network.interfaces.length > 0) {
      networkInfo['Network Interfaces'] = `${network.interfaces.length} interface(s)`;
      
      network.interfaces.forEach((iface: any, index: number) => {
        if (iface.ip?.macAddr) networkInfo[`Interface ${index + 1} MAC`] = iface.ip.macAddr;
        if (iface.ip?.addresses && iface.ip.addresses.length > 0) {
          const primaryAddr = iface.ip.addresses.find((addr: any) => addr.state === 'preferred');
          if (primaryAddr) networkInfo[`Interface ${index + 1} IP`] = primaryAddr.address;
        }
      });
    }
    
    return Object.keys(networkInfo).length > 0 ? networkInfo : null;
  };

  const networkInfo = getNetworkInfo();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <InfoCard title="Resource Overview">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card className={classes.statusCard}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    State
                  </Typography>
                  <Typography variant="h4">
                    {resourceState || 'Unknown'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className={classes.statusCard}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    Sync Status
                  </Typography>
                  <Typography variant="h4">
                    {syncStatus || 'Unknown'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className={classes.statusCard}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    Kind
                  </Typography>
                  <Typography variant="h4">
                    {manifest?.kind || 'Unknown'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className={classes.statusCard}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    Power State
                  </Typography>
                  <Typography variant="h4">
                    {objectData?.status?.powerState || 'Unknown'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </InfoCard>
      </Grid>

      <Grid item xs={12}>
        <InfoCard>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="resource details tabs">
            <Tab label="Basic Information" />
            <Tab label="Manifest Details" />
            <Tab label="Object Status" />
            <Tab label="Conditions" />
            <Tab label="YAML Views" />
            {canEditResource && resourceName && namespaceName && namespaceUrnId && apiVersion && (
              <Tab label="Edit Manifest" />
            )}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StructuredMetadataTable metadata={basicInfo} />
              </Grid>
              
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
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              {Object.keys(manifestInfo).length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Manifest Information
                  </Typography>
                  <StructuredMetadataTable metadata={manifestInfo} />
                </Grid>
              )}
              
              {manifest?.metadata?.labels && (
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Labels
                  </Typography>
                  <StructuredMetadataTable metadata={manifest.metadata.labels} />
                </Grid>
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              {objectStatus && (
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Object Status
                  </Typography>
                  <StructuredMetadataTable metadata={objectStatus} />
                </Grid>
              )}
              
              {networkInfo && (
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Network Information
                  </Typography>
                  <StructuredMetadataTable metadata={networkInfo} />
                </Grid>
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              {resourceData.wait?.conditions && resourceData.wait.conditions.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Wait Conditions
                  </Typography>
                  <Table
                    columns={waitConditionColumns}
                    data={resourceData.wait.conditions}
                    options={{
                      search: false,
                      paging: false,
                      padding: 'dense',
                    }}
                  />
                </Grid>
              )}

              {objectData?.status?.conditions && objectData.status.conditions.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Resource Conditions
                  </Typography>
                  <Table
                    columns={resourceConditionColumns}
                    data={objectData.status.conditions}
                    options={{
                      search: true,
                      paging: objectData.status.conditions.length > 10,
                      pageSize: 10,
                      padding: 'dense',
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={3}>
              {manifest && (
                <Grid item xs={12}>
                  <Accordion className={classes.yamlContainer} defaultExpanded>
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
                            maxHeight: '600px',
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
                      <Typography variant="h6">Live Kubernetes Object</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box width="100%">
                        <CodeSnippet
                          text={formatYaml(objectData)}
                          language="yaml"
                          showLineNumbers
                          customStyle={{ 
                            fontSize: '12px',
                            maxHeight: '600px',
                            overflow: 'auto'
                          }}
                        />
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* YAML Editor Tab */}
          {canEditResource && resourceName && namespaceName && namespaceUrnId && apiVersion && (
            <TabPanel value={tabValue} index={5}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    Edit Resource Manifest
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {resourceName} ({resourceKind})
                  </Typography>
                  
                  {isLoadingManifest ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                      <Typography>Loading manifest...</Typography>
                    </Box>
                  ) : (
                    <Box className={classes.yamlEditorContainer}>
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

                      {/* Action Buttons */}
                      <Box className={classes.editorActions}>
                        <Button
                          variant="outlined"
                          onClick={handleCancelEditing}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => setConfirmDialogOpen(true)}
                          disabled={!editingYaml.trim() || !!yamlValidationError || isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </TabPanel>
          )}

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
      </Grid>
    </Grid>
  );
};