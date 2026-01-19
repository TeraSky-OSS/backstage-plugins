import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  Collapse,
} from '@material-ui/core';
import { ExpandMore, ChevronRight } from '@material-ui/icons';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { vcfOperationsApiRef, MetricData, Resource, VcfOperationsApiError, VcfOperationsInstance } from '../api/VcfOperationsClient';
import { MetricChart } from './MetricChart';
import { NotImplementedMessage } from './NotImplementedMessage';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  topControls: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  topControlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(3),
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    gap: theme.spacing(2),
    minHeight: 0, // Important for flex children
  },
  leftPanel: {
    width: 320,
    minWidth: 320,
    display: 'flex',
    flexDirection: 'column',
  },
  metricsCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  metricsCardContent: {
    flex: 1,
    overflow: 'auto',
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  chartsContainer: {
    flex: 1,
    overflow: 'auto',
  },
  chartCard: {
    marginBottom: theme.spacing(2),
    height: 400,
  },
  formControl: {
    minWidth: 180,
  },
  metricCheckbox: {
    padding: theme.spacing(0.5),
  },
  metricItem: {
    paddingLeft: theme.spacing(4), // Indent metrics under category headers
    paddingRight: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  categoryHeader: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: theme.palette.primary.main,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.5),
    '&:first-child': {
      marginTop: theme.spacing(0.5),
    },
  },
  categoryHeaderContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    paddingLeft: 0, // Align to the left edge
    paddingRight: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.5),
    '&:first-child': {
      marginTop: theme.spacing(0.5),
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      cursor: 'pointer',
    },
  },
  categoryTitle: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: theme.palette.primary.main,
    flex: 1,
    marginLeft: theme.spacing(0.5),
  },
  selectAllContainer: {
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    // Removed background color - same as rest of panel
  },
  refreshButton: {
    minWidth: 'auto',
    padding: theme.spacing(0.5, 1),
  },
  resourceInfo: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
  },
}));

interface MetricSelection {
  key: string;
  label: string;
}

interface MetricCategory {
  name: string;
  metrics: MetricSelection[];
}

// Virtual Machine Metrics (kind:virtualmachine)
const VM_METRIC_CATEGORIES: MetricCategory[] = [
  {
    name: 'CPU Metrics',
    metrics: [
      { key: 'cpu|usage_average', label: 'Usage (%)' },
      { key: 'cpu|usagemhz_average', label: 'Usage (MHz)' },
      { key: 'cpu|readyPct', label: 'Ready (%)' },
      { key: 'cpu|costopPct', label: 'Co-Stop (%)' },
      { key: 'cpu|capacity_contentionPct', label: 'Contention (%)' },
    ],
  },
  {
    name: 'Memory Metrics',
    metrics: [
      { key: 'mem|consumed_average', label: 'Consumed (KB)' },
      { key: 'mem|balloonPct', label: 'Balloon (%)' },
      { key: 'mem|host_contentionPct', label: 'Contention (%)' },
      { key: 'mem|guest_usage', label: 'Guest Usage (%)' },
      { key: 'mem|guest_demand', label: 'Guest Demand (%)' },
      { key: 'mem|swapped_average', label: 'Swapped (KB)' },
      { key: 'mem|usage_average', label: 'Usage (%)' },
      { key: 'mem|vmMemoryDemand', label: 'Utilization (KB)' },
    ],
  },
  {
    name: 'Storage Metrics',
    metrics: [
      { key: 'diskspace|snapshot', label: 'Snapshot Space (GB)' },
      { key: 'diskspace|usageWithoutOverhead', label: 'Usage (GB)' },
      { key: 'storage|totalReadLatency_average', label: 'Read Latency (ms)' },
      { key: 'storage|totalWriteLatency_average', label: 'Write Latency (ms)' },
      { key: 'virtualDisk|read_average', label: 'Read Throughput (KBps)' },
    ],
  },
  {
    name: 'Network Metrics',
    metrics: [
      { key: 'net|droppedTx_summation', label: 'Dropped Tx (Packets)' },
      { key: 'net|received_average', label: 'Data Receive Rate (KBps)' },
      { key: 'net|transmitted_average', label: 'Data Transmit Rate (KBps)' },
      { key: 'net|usage_average', label: 'Usage Rate (KBps)' },
    ],
  },
  {
    name: 'System Health',
    metrics: [
      { key: 'System Attributes|health', label: 'Health Score' },
      { key: 'badge|health', label: 'Health Badge' },
      { key: 'badge|efficiency', label: 'Efficiency Badge' },
      { key: 'badge|risk', label: 'Risk Badge' },
      { key: 'badge|compliance', label: 'Compliance Badge' },
      { key: 'System Attributes|availability', label: 'Availability' },
    ],
  },
  {
    name: 'Alerts & Monitoring',
    metrics: [
      { key: 'System Attributes|total_alert_count', label: 'Total Alerts' },
      { key: 'System Attributes|alert_count_critical', label: 'Critical Alerts' },
      { key: 'System Attributes|alert_count_warning', label: 'Warning Alerts' },
      { key: 'System Attributes|alert_count_info', label: 'Info Alerts' },
    ],
  },
  {
    name: 'Power & Environment',
    metrics: [
      { key: 'power|energy_summation_sum', label: 'Energy Consumed (Wh)' },
    ],
  },
];

// Supervisor Namespace Metrics (kind:supervisornamespace)
const SUPERVISOR_NAMESPACE_METRIC_CATEGORIES: MetricCategory[] = [
  {
    name: 'System Health & Compliance',
    metrics: [
      { key: 'badge|compliance', label: 'Compliance Badge' },
      { key: 'badge|efficiency', label: 'Efficiency Badge' },
      { key: 'badge|health', label: 'Health Badge' },
      { key: 'badge|risk', label: 'Risk Badge' },
      { key: 'System Attributes|health', label: 'Health Score' },
      { key: 'System Attributes|availability', label: 'Availability' },
    ],
  },
  {
    name: 'Hardware Configuration',
    metrics: [
      { key: 'config|hardware|num_Cpu', label: 'Number of CPUs' },
    ],
  },
  {
    name: 'CPU Metrics',
    metrics: [
      { key: 'cpu|effective_usagemhz_average', label: 'Effective Usage (MHz)' },
      { key: 'cpu|usagemhz_average', label: 'Usage (MHz)' },
    ],
  },
  {
    name: 'Memory Metrics',
    metrics: [
      { key: 'mem|consumed_average', label: 'Consumed (KB)' },
      { key: 'mem|effective_consumed_average', label: 'Effective Consumed (KB)' },
    ],
  },
  {
    name: 'Configuration & Status',
    metrics: [
      { key: 'summary|configStatus', label: 'Configuration Status' },
    ],
  },
  {
    name: 'Pods & Virtual Machines',
    metrics: [
      { key: 'summary|total_number_pods', label: 'Total Number of Pods' },
      { key: 'summary|number_running_vms', label: 'Number of Running VMs' },
      { key: 'summary|total_number_vms', label: 'Total Number of VMs' },
    ],
  },
  {
    name: 'System Attributes & Alerts',
    metrics: [
      { key: 'System Attributes|alert_count_critical', label: 'Critical Alerts' },
      { key: 'System Attributes|alert_count_immediate', label: 'Immediate Alerts' },
      { key: 'System Attributes|alert_count_info', label: 'Info Alerts' },
      { key: 'System Attributes|alert_count_warning', label: 'Warning Alerts' },
      { key: 'System Attributes|self_alert_count', label: 'Self Alert Count' },
      { key: 'System Attributes|child_all_metrics', label: 'Child All Metrics' },
      { key: 'System Attributes|all_metrics', label: 'All Metrics' },
      { key: 'System Attributes|total_alert_count', label: 'Total Alert Count' },
      { key: 'System Attributes|total_alarms', label: 'Total Alarms' },
    ],
  },
];

// VCF Automation Project Metrics (entityType === 'vcf-automation-project')
const PROJECT_METRIC_CATEGORIES: MetricCategory[] = [
  {
    name: 'System Health & Compliance',
    metrics: [
      { key: 'badge|compliance', label: 'Compliance Badge' },
      { key: 'badge|efficiency', label: 'Efficiency Badge' },
      { key: 'badge|health', label: 'Health Badge' },
      { key: 'badge|risk', label: 'Risk Badge' },
      { key: 'System Attributes|health', label: 'Health Score' },
      { key: 'System Attributes|availability', label: 'Availability' },
    ],
  },
  {
    name: 'Cost Metrics',
    metrics: [
      { key: 'cost|aggregatedMtdAdditionalCost', label: 'MTD Additional Cost' },
      { key: 'cost|aggregatedMtdCpuCost', label: 'MTD CPU Cost' },
      { key: 'cost|aggregatedMtdMemoryCost', label: 'MTD Memory Cost' },
      { key: 'cost|aggregatedMtdStorageCost', label: 'MTD Storage Cost' },
      { key: 'cost|aggregatedMtdTotalCost', label: 'MTD Total Cost' },
      { key: 'cost|totalAdditionalCost', label: 'Total Additional Cost' },
      { key: 'cost|totalCpuCost', label: 'Total CPU Cost' },
      { key: 'cost|totalMemoryCost', label: 'Total Memory Cost' },
      { key: 'cost|storageCost', label: 'Storage Cost' },
    ],
  },
  {
    name: 'Resource Usage',
    metrics: [
      { key: 'cpu|reservation', label: 'CPU Reservation' },
      { key: 'cpu|usagemhz_average', label: 'CPU Usage (MHz)' },
      { key: 'mem|reservation', label: 'Memory Reservation' },
      { key: 'mem|usage_average', label: 'Memory Usage (%)' },
      { key: 'diskspace|total_usage', label: 'Total Disk Usage' },
    ],
  },
  {
    name: 'System Attributes & Alerts',
    metrics: [
      { key: 'System Attributes|alert_count_immediate', label: 'Immediate Alerts' },
      { key: 'System Attributes|alert_count_info', label: 'Info Alerts' },
      { key: 'System Attributes|alert_count_warning', label: 'Warning Alerts' },
      { key: 'System Attributes|child_all_metrics', label: 'Child All Metrics' },
      { key: 'System Attributes|self_alert_count', label: 'Self Alert Count' },
      { key: 'System Attributes|all_metrics', label: 'All Metrics' },
      { key: 'System Attributes|total_alert_count', label: 'Total Alert Count' },
      { key: 'System Attributes|total_alarms', label: 'Total Alarms' },
    ],
  },
  {
    name: 'Metering & Billing',
    metrics: [
      { key: 'summary|metering|additional', label: 'Additional Price' },
      { key: 'summary|metering|cpu', label: 'CPU Price' },
      { key: 'summary|metering|memory', label: 'Memory Price' },
      { key: 'summary|metering|additionalMtd', label: 'MTD Additional Price' },
      { key: 'summary|metering|cpuMtd', label: 'MTD CPU Price' },
      { key: 'summary|metering|memoryMtd', label: 'MTD Memory Price' },
      { key: 'summary|metering|storageMtd', label: 'MTD Storage Price' },
      { key: 'summary|metering|valueMtd', label: 'MTD Total Price' },
      { key: 'summary|metering|storage', label: 'Storage Price' },
      { key: 'summary|metering|value', label: 'Total Price' },
    ],
  },
];

// Cluster Metrics (kind:cluster)
const CLUSTER_METRIC_CATEGORIES: MetricCategory[] = [
  {
    name: 'System Health & Compliance',
    metrics: [
      { key: 'badge|compliance', label: 'Compliance Badge' },
      { key: 'badge|efficiency', label: 'Efficiency Badge' },
      { key: 'badge|health', label: 'Health Badge' },
      { key: 'badge|risk', label: 'Risk Badge' },
      { key: 'badge|workload', label: 'Workload Badge' },
    ],
  },
  {
    name: 'Capacity Analytics',
    metrics: [
      { key: 'OnlineCapacityAnalytics|capacityRemainingPercentage', label: 'Capacity Remaining (%)' },
      { key: 'OnlineCapacityAnalytics|cpu|capacityRemaining', label: 'CPU Capacity Remaining' },
      { key: 'OnlineCapacityAnalytics|cpu|recommendedSize', label: 'CPU Recommended Size' },
      { key: 'OnlineCapacityAnalytics|cpu|timeRemaining', label: 'CPU Time Remaining' },
      { key: 'OnlineCapacityAnalytics|mem|capacityRemaining', label: 'Memory Capacity Remaining' },
      { key: 'OnlineCapacityAnalytics|mem|recommendedSize', label: 'Memory Recommended Size' },
      { key: 'OnlineCapacityAnalytics|mem|timeRemaining', label: 'Memory Time Remaining' },
      { key: 'OnlineCapacityAnalytics|timeRemaining', label: 'Overall Time Remaining' },
    ],
  },
  {
    name: 'CPU Metrics',
    metrics: [
      { key: 'cpu|capacity_contentionPct', label: 'Capacity Contention (%)' },
      { key: 'cpu|demandmhz', label: 'Demand (MHz)' },
      { key: 'cpu|dynamic_entitlement', label: 'Dynamic Entitlement' },
      { key: 'cpu|effective_limit', label: 'Effective Limit' },
      { key: 'cpu|estimated_entitlement', label: 'Estimated Entitlement' },
      { key: 'cpu|reservation_used', label: 'Reservation Used' },
      { key: 'cpu|usagemhz_average', label: 'Usage (MHz)' },
      { key: 'cpu|workload', label: 'CPU Workload' },
    ],
  },
  {
    name: 'Memory Metrics',
    metrics: [
      { key: 'mem|consumed_average', label: 'Consumed (KB)' },
      { key: 'mem|host_contentionPct', label: 'Host Contention (%)' },
      { key: 'mem|dynamic_entitlement', label: 'Dynamic Entitlement' },
      { key: 'mem|effective_limit', label: 'Effective Limit' },
      { key: 'mem|granted_average', label: 'Granted (KB)' },
      { key: 'mem|active_average', label: 'Active (KB)' },
      { key: 'mem|guest_demand', label: 'Guest Demand (KB)' },
      { key: 'mem|guest_usage', label: 'Guest Usage (%)' },
      { key: 'mem|reservation_used', label: 'Reservation Used' },
      { key: 'mem|shared_average', label: 'Shared (KB)' },
      { key: 'mem|swapinRate_average', label: 'Swap In Rate (KBps)' },
      { key: 'mem|swapoutRate_average', label: 'Swap Out Rate (KBps)' },
      { key: 'mem|guest_provisioned', label: 'Guest Provisioned (KB)' },
      { key: 'mem|usage_average', label: 'Usage (%)' },
      { key: 'mem|overhead_average', label: 'Overhead (KB)' },
      { key: 'mem|workload', label: 'Memory Workload' },
    ],
  },
  {
    name: 'Virtual Machine Summary',
    metrics: [
      { key: 'summary|number_running_vms', label: 'Number of Running VMs' },
      { key: 'summary|number_vm_templates', label: 'Number of VM Templates' },
      { key: 'summary|total_number_vms', label: 'Total Number of VMs' },
    ],
  },
];

// Helper function to get metric categories based on resource kind
const getMetricCategoriesForKind = (entityType?: string, tags?: string[]): MetricCategory[] => {
  if (entityType === 'CCI.Supervisor.Namespace') {
    return SUPERVISOR_NAMESPACE_METRIC_CATEGORIES;
  }
  if (entityType === 'vcf-automation-project') {
    return PROJECT_METRIC_CATEGORIES;
  }
  if (tags?.includes('kind:cluster')) {
    return CLUSTER_METRIC_CATEGORIES;
  }
  // VM metrics for Cloud.vSphere.Machine, kind:virtualmachine, and other resource types
  if (entityType === 'Cloud.vSphere.Machine' || tags?.includes('kind:virtualmachine')) {
    return VM_METRIC_CATEGORIES;
  }
  // Default to VM metrics for other resource types
  return VM_METRIC_CATEGORIES;
};

// Helper function to get all metrics for a given set of categories
const getAllMetricsFromCategories = (categories: MetricCategory[]): MetricSelection[] => {
  return categories.flatMap(category => category.metrics);
};

const TIME_RANGES = [
  { label: 'Last Hour', hours: 1 },
  { label: 'Last 6 Hours', hours: 6 },
  { label: 'Last 24 Hours', hours: 24 },
  { label: 'Last 7 Days', hours: 168 },
  { label: 'Last 30 Days', hours: 720 },
  { label: 'Custom', hours: -1 },
];

interface ResourceDetectionResult {
  found: boolean;
  resource?: Resource;
  error?: string;
  permissionError?: boolean;
  notImplemented?: {
    entityType: string;
    entityKind?: string;
    reason: string;
  };
}

// Helper function to check if an error is a permission error
const isPermissionError = (error: unknown): boolean => {
  return error instanceof VcfOperationsApiError && error.status === 403;
};

// Helper function to extract error message from any error type
const getErrorMessage = (error: unknown): string => {
  if (error instanceof VcfOperationsApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const VCFOperationsExplorer = () => {
  const classes = useStyles();
  const vcfOperationsApi = useApi(vcfOperationsApiRef);
  const { entity } = useEntity();

  // Get entity type and tags to determine resource kind
  const entityType = entity.spec?.type as string;
  const entityTags = entity.metadata.tags || [];
  
  // Get appropriate metric categories based on resource kind
  const currentMetricCategories = getMetricCategoriesForKind(entityType, entityTags);
  const allMetrics = getAllMetricsFromCategories(currentMetricCategories);

  // Default selected metrics based on resource kind
  const getDefaultMetrics = (entityType?: string, tags?: string[]): MetricSelection[] => {
    if (entityType === 'CCI.Supervisor.Namespace') {
      return [
        { key: 'badge|health', label: 'Health Badge' },
        { key: 'badge|compliance', label: 'Compliance Badge' },
        { key: 'cpu|effective_usagemhz_average', label: 'Effective CPU Usage (MHz)' },
        { key: 'mem|consumed_average', label: 'Memory Consumed (KB)' },
      ];
    }
    if (entityType === 'vcf-automation-project') {
      return [
        { key: 'badge|health', label: 'Health Badge' },
        { key: 'badge|compliance', label: 'Compliance Badge' },
        { key: 'cost|aggregatedMtdTotalCost', label: 'MTD Total Cost' },
        { key: 'cpu|usagemhz_average', label: 'CPU Usage (MHz)' },
        { key: 'mem|usage_average', label: 'Memory Usage (%)' },
      ];
    }
    if (tags?.includes('kind:cluster')) {
      return [
        { key: 'mem|usage_average', label: 'Memory Usage (%)' },
        { key: 'cpu|usagemhz_average', label: 'CPU Usage (MHz)' },
        { key: 'OnlineCapacityAnalytics|timeRemaining', label: 'Overall Time Remaining' },
        { key: 'badge|compliance', label: 'Compliance Badge' },
        { key: 'badge|efficiency', label: 'Efficiency Badge' },
        { key: 'badge|health', label: 'Health Badge' },
        { key: 'badge|risk', label: 'Risk Badge' },
        { key: 'badge|workload', label: 'Workload Badge' },
      ];
    }
    // Default for Cloud.vSphere.Machine, kind:virtualmachine, and other resources
    return [
      { key: 'cpu|usage_average', label: 'CPU Usage (%)' },
      { key: 'mem|usage_average', label: 'Memory Usage (%)' },
      { key: 'net|usage_average', label: 'Network Usage (KBps)' },
    ];
  };

  const [selectedMetrics, setSelectedMetrics] = useState<MetricSelection[]>(getDefaultMetrics(entityType, entityTags));
  const [timeRange, setTimeRange] = useState(24); // Default to 24 hours
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [rollUpType, setRollUpType] = useState('AVERAGE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [instances, setInstances] = useState<VcfOperationsInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [resourceDetection, setResourceDetection] = useState<ResourceDetectionResult>({ found: false });
  const [detectingResource, setDetectingResource] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load instances
  useEffect(() => {
    const loadInstances = async () => {
      try {
        const instancesList = await vcfOperationsApi.getInstances();
        setInstances(instancesList);
        
        // Auto-select instance based on entity's VCF Automation instance
        const vcfaInstanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];
        
        if (instancesList.length === 1) {
          // Only one instance available, select it
          setSelectedInstance(instancesList[0].name);
        } else if (vcfaInstanceName && instancesList.length > 1) {
          // Multiple instances available, find the matching one based on relatedVCFAInstances
          const matchedInstance = instancesList.find(instance => 
            instance.relatedVCFAInstances?.includes(vcfaInstanceName)
          );
          
          if (matchedInstance) {
            setSelectedInstance(matchedInstance.name);
          }
          // If no match found, user will need to manually select
        }
      } catch (err) {
        // Check if this is a permission error
        if (isPermissionError(err)) {
          setResourceDetection({
            found: false,
            permissionError: true,
            error: getErrorMessage(err),
          });
          setDetectingResource(false);
        }
        // Other errors are handled silently for instances loading
      }
    };

    loadInstances();
  }, [vcfOperationsApi, entity]);

  // Extract URN from CCI namespace endpoint URL
  const extractUrnFromEndpoint = (endpoint: string): string | null => {
    const match = endpoint.match(/urn:vcloud:namespace:[a-f0-9-]+/);
    return match ? match[0] : null;
  };

  // Detect appropriate VCF Operations resource
  useEffect(() => {
    const detectResource = async () => {
      setDetectingResource(true);
      setError(null);

      try {
        const entityKind = entity.kind;
        const entityType = entity.spec?.type as string;
        const entityTitle = entity.metadata.title || entity.metadata.name;
        const tags = entity.metadata.tags || [];

        // Check for supervisor namespace components
        const cciNamespaceEndpoint = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-namespace-endpoint'];
        if (cciNamespaceEndpoint) {
          const urn = extractUrnFromEndpoint(cciNamespaceEndpoint);
          if (urn) {
            try {
              const resource = await vcfOperationsApi.findResourceByProperty(
                'summary|vcfa_ns_uuid',
                urn,
                selectedInstance || undefined,
              );
              
              if (resource) {
                setResourceDetection({ found: true, resource });
                return;
              }
              setResourceDetection({
                found: false,
                error: `No VCF Operations resource found for namespace URN: ${urn}. Make sure the namespace exists in VCF Operations and the URN matches exactly.`,
              });
              return;
            } catch (err) {
              setResourceDetection({
                found: false,
                error: `Error searching for namespace in VCF Operations: ${getErrorMessage(err)}`,
                permissionError: isPermissionError(err),
              });
              return;
            }
          }
        }

        // Check for supervisor resources with kind:virtualmachine tag
        if (tags.includes('kind:virtualmachine')) {
          let resourceName = entityTitle;
          
          if (tags.includes('standalone-resource')) {
            // Handle standalone VMs - remove " (Standalone)" suffix
            resourceName = entityTitle.replace(' (Standalone)', '');
          } else {
            // Handle non-standalone VMs - extract name from "Open Remote Console" link
            const links = entity.metadata.links || [];
            const remoteConsoleLink = links.find(link => link.title === 'Open Remote Console');
            
            if (remoteConsoleLink && remoteConsoleLink.url) {
              // Extract last segment from URL (after final /)
              const urlSegments = remoteConsoleLink.url.split('/');
              const lastSegment = urlSegments[urlSegments.length - 1];
              
              if (lastSegment) {
                resourceName = lastSegment;
              } else {
                setResourceDetection({
                  found: false,
                  error: `Could not extract VM name from "Open Remote Console" link: ${remoteConsoleLink.url}`,
                });
                return;
              }
            } else {
              setResourceDetection({
                found: false,
                error: `No "Open Remote Console" link found in entity metadata. Non-standalone VMs require this link to extract the VM name.`,
              });
              return;
            }
          }
          
          try {
            const resource = await vcfOperationsApi.findResourceByName(
              resourceName,
              selectedInstance || undefined,
              'vm',
            );
            
            if (resource) {
              setResourceDetection({ found: true, resource });
              return;
            }
            setResourceDetection({
              found: false,
              error: `No VCF Operations resource found with name: ${resourceName}. Make sure the VM exists in VCF Operations and the name matches exactly.`,
            });
            return;
          } catch (err) {
            setResourceDetection({
              found: false,
              error: `Error searching for VM in VCF Operations: ${getErrorMessage(err)}`,
              permissionError: isPermissionError(err),
            });
            return;
          }
        }

        // Check for supervisor namespace components with spec.type === 'CCI.Supervisor.Namespace'
        if (entityType === 'CCI.Supervisor.Namespace') {
          // For supervisor namespaces, try to find by title/name first
          try {
            const resource = await vcfOperationsApi.findResourceByName(
              entityTitle,
              selectedInstance || undefined,
              'supervisor-namespace',
            );
            
            if (resource) {
              setResourceDetection({ found: true, resource });
              return;
            }
            setResourceDetection({
              found: false,
              error: `No VCF Operations resource found for supervisor namespace: ${entityTitle}. Make sure the namespace exists in VCF Operations and the name matches exactly.`,
            });
            return;
          } catch (err) {
            setResourceDetection({
              found: false,
              error: `Error searching for supervisor namespace in VCF Operations: ${getErrorMessage(err)}`,
              permissionError: isPermissionError(err),
            });
            return;
          }
        }

        // Check for Cloud.vSphere.Machine components
        if (entityType === 'Cloud.vSphere.Machine') {
          const morefAnnotation = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-vm-moref-id'];
          
          if (!morefAnnotation) {
            setResourceDetection({
              found: false,
              error: 'No moref ID annotation found. Cloud.vSphere.Machine components require the "terasky.backstage.io/vcf-automation-vm-moref-id" annotation.',
            });
            return;
          }
          
          // Transform the moref value by stripping everything before and including the ":"
          // e.g., "VirtualMachine:vm-174990" -> "vm-174990"
          const moid = morefAnnotation.includes(':') 
            ? morefAnnotation.substring(morefAnnotation.indexOf(':') + 1)
            : morefAnnotation;
          
          try {
            const resource = await vcfOperationsApi.findResourceByProperty(
              'summary|MOID',
              moid,
              selectedInstance || undefined,
            );
            
            if (resource) {
              setResourceDetection({ found: true, resource });
              return;
            }
            setResourceDetection({
              found: false,
              error: `No VCF Operations resource found with MOID: ${moid}. Make sure the VM exists in VCF Operations and the MOID matches exactly.`,
            });
            return;
          } catch (err) {
            setResourceDetection({
              found: false,
              error: `Error searching for VM by MOID in VCF Operations: ${getErrorMessage(err)}`,
              permissionError: isPermissionError(err),
            });
            return;
          }
        }

        // Check for cluster components with kind:cluster tag
        if (tags.includes('kind:cluster')) {
          let clusterName = entityTitle;
          
          // Handle standalone clusters - remove " (Standalone)" suffix
          if (tags.includes('standalone-resource')) {
            clusterName = entityTitle.replace(' (Standalone)', '');
          }
          
          try {
            const resource = await vcfOperationsApi.findResourceByName(
              clusterName,
              selectedInstance || undefined,
              'cluster',
            );
            
            if (resource) {
              setResourceDetection({ found: true, resource });
              return;
            }
            setResourceDetection({
              found: false,
              error: `No VCF Operations resource found for cluster: ${clusterName}. Make sure the cluster exists in VCF Operations and the name matches exactly.`,
            });
            return;
          } catch (err) {
            setResourceDetection({
              found: false,
              error: `Error searching for cluster in VCF Operations: ${getErrorMessage(err)}`,
              permissionError: isPermissionError(err),
            });
            return;
          }
        }

        // Check for VCF Automation project domains
        if (entityKind.toLowerCase() === 'domain' && entityType === 'vcf-automation-project') {
          try {
            const resource = await vcfOperationsApi.findResourceByName(
              entityTitle,
              selectedInstance || undefined,
              'project',
            );
            
            if (resource) {
              setResourceDetection({ found: true, resource });
              return;
            }
            setResourceDetection({
              found: false,
              error: `No VCF Operations resource found for project: ${entityTitle}. Make sure the project exists in VCF Operations and the name matches exactly.`,
            });
            return;
          } catch (err) {
            setResourceDetection({
              found: false,
              error: `Error searching for project in VCF Operations: ${getErrorMessage(err)}`,
              permissionError: isPermissionError(err),
            });
            return;
          }
        }

        // Check for deployment systems - not implemented
        if (entityKind.toLowerCase() === 'system' && entityType === 'deployment') {
          setResourceDetection({
            found: false,
            notImplemented: {
              entityType: 'Deployment',
              reason: 'Deployment metrics support is currently being developed and will be available in an upcoming release.',
            },
          });
          return;
        }

        // Check for other kinds
        const otherKinds = tags.filter(tag => tag.startsWith('kind:') && !['kind:virtualmachine', 'kind:cluster'].includes(tag));
        if (otherKinds.length > 0) {
          setResourceDetection({
            found: false,
            notImplemented: {
              entityType: otherKinds[0].replace('kind:', ''),
              reason: `Support for ${otherKinds[0].replace('kind:', '')} resources is currently being developed and will be available in an upcoming release.`,
            },
          });
          return;
        }

        // Default: No specific mapping found
        setResourceDetection({
          found: false,
          error: `No direct VCF Operations resource mapping found for this entity type (${entityKind}:${entityType}).`,
        });

      } catch (err) {
        setResourceDetection({
          found: false,
          error: `Unexpected error during resource detection: ${getErrorMessage(err)}`,
          permissionError: isPermissionError(err),
        });
      } finally {
        setDetectingResource(false);
      }
    };

    if (selectedInstance || instances.length === 1) {
      detectResource();
    }
  }, [entity, selectedInstance, instances, vcfOperationsApi]);

  const getTimeRangeParams = useCallback(() => {
    const now = Date.now();
    let begin: number;
    let end: number = now;

    if (timeRange === -1 && customStartTime && customEndTime) {
      begin = new Date(customStartTime).getTime();
      end = new Date(customEndTime).getTime();
    } else {
      begin = now - (timeRange * 60 * 60 * 1000);
    }

    // Ensure valid time range (begin < end)
    if (begin >= end) {
      begin = end - (60 * 60 * 1000); // 1 hour before end
    }
    
    // Debug logging for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.log('Time range params:', {
        now: new Date(now).toISOString(),
        begin: new Date(begin).toISOString(),
        end: new Date(end).toISOString(),
        timeRange,
        customStartTime,
        customEndTime,
      });
    }

    return { begin, end };
  }, [timeRange, customStartTime, customEndTime]);

  const fetchMetrics = useCallback(async () => {
    if (!resourceDetection.found || !resourceDetection.resource || selectedMetrics.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { begin, end } = getTimeRangeParams();
      const statKeys = selectedMetrics.map(metric => metric.key);

      const data = await vcfOperationsApi.getResourceMetrics(
        resourceDetection.resource.identifier,
        statKeys,
        begin,
        end,
        rollUpType,
        selectedInstance || undefined,
      );

      setMetricsData(data.values || []);
    } catch (err) {
      setError(getErrorMessage(err));
      setMetricsData([]);
    } finally {
      setLoading(false);
    }
  }, [resourceDetection, selectedMetrics, getTimeRangeParams, rollUpType, selectedInstance, vcfOperationsApi]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !resourceDetection.found) return undefined;

    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics, resourceDetection.found]);

  // Automatic loading effect - load metrics whenever selections change
  useEffect(() => {
    if (resourceDetection.found && selectedMetrics.length > 0 && selectedInstance) {
      fetchMetrics();
    }
  }, [selectedMetrics, timeRange, rollUpType, selectedInstance, resourceDetection.found]);

  const handleMetricToggle = (metric: MetricSelection) => {
    setSelectedMetrics(prev => {
      const isSelected = prev.some(m => m.key === metric.key);
      if (isSelected) {
        return prev.filter(m => m.key !== metric.key);
      }
      return [...prev, metric];
    });
  };

  const handleSelectAll = () => {
    setSelectedMetrics([...allMetrics]);
  };

  const handleDeselectAll = () => {
    setSelectedMetrics([]);
  };

  const handleManualRefresh = () => {
    if (resourceDetection.found && selectedMetrics.length > 0 && selectedInstance) {
      fetchMetrics();
    }
  };

  const handleCategoryToggle = (category: MetricCategory) => {
    const categoryMetricKeys = category.metrics.map(m => m.key);
    const areAllCategorySelected = categoryMetricKeys.every(key => 
      selectedMetrics.some(m => m.key === key)
    );

    setSelectedMetrics(prev => {
      if (areAllCategorySelected) {
        // Deselect all metrics in this category
        return prev.filter(metric => !categoryMetricKeys.includes(metric.key));
      } else {
        // Select all metrics in this category (add any that aren't already selected)
        const newMetrics = category.metrics.filter(metric => 
          !prev.some(selected => selected.key === metric.key)
        );
        return [...prev, ...newMetrics];
      }
    });
  };

  const isCategorySelected = (category: MetricCategory) => {
    const categoryMetricKeys = category.metrics.map(m => m.key);
    return categoryMetricKeys.every(key => 
      selectedMetrics.some(m => m.key === key)
    );
  };

  const isCategoryPartiallySelected = (category: MetricCategory) => {
    const categoryMetricKeys = category.metrics.map(m => m.key);
    const selectedCount = categoryMetricKeys.filter(key => 
      selectedMetrics.some(m => m.key === key)
    ).length;
    return selectedCount > 0 && selectedCount < categoryMetricKeys.length;
  };

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const isAllSelected = selectedMetrics.length === allMetrics.length;
  const isNoneSelected = selectedMetrics.length === 0;

  // Show message when multiple instances available but none selected
  if (instances.length > 1 && !selectedInstance) {
    const vcfaInstanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];
    
    return (
      <Box className={classes.root}>
        <Card>
          <CardContent>
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                Select a VCF Operations Instance
              </Typography>
              <Typography variant="body2" gutterBottom>
                Multiple VCF Operations instances are available. Please select one to view metrics:
              </Typography>
              {vcfaInstanceName && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Note: Could not automatically match VCF Automation instance "{vcfaInstanceName}" to a VCF Operations instance. 
                  Check that the instance is listed in the relatedVCFAInstances configuration.
                </Typography>
              )}
              <Box style={{ marginTop: 16 }}>
                <FormControl style={{ minWidth: 300 }}>
                  <InputLabel>Instance</InputLabel>
                  <Select
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value as string)}
                  >
                    {instances.map((instance) => (
                      <MenuItem key={instance.name} value={instance.name}>
                        {instance.name}
                        {instance.relatedVCFAInstances && instance.relatedVCFAInstances.length > 0 && 
                          ` (${instance.relatedVCFAInstances.join(', ')})`
                        }
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Show loading while detecting resource
  if (detectingResource) {
    return (
      <Box className={classes.root}>
        <Card>
          <CardContent>
            <Box className={classes.loadingContainer}>
              <Box textAlign="center">
                <CircularProgress />
                <Typography variant="body2" style={{ marginTop: 16 }}>
                  Detecting VCF Operations resource...
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Show permission error if user doesn't have access
  if (resourceDetection.permissionError) {
    return (
      <Box className={classes.root}>
        <Card>
          <CardContent>
            <Alert severity="error">
              <Typography variant="h6" gutterBottom>
                Access Denied
              </Typography>
              <Typography variant="body2">
                {resourceDetection.error}
              </Typography>
              <Typography variant="body2" style={{ marginTop: 8 }}>
                Please contact your administrator to request access to VCF Operations metrics.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Show not implemented message
  if (resourceDetection.notImplemented) {
    return (
      <NotImplementedMessage
        entityType={resourceDetection.notImplemented.entityType}
        entityKind={resourceDetection.notImplemented.entityKind}
        reason={resourceDetection.notImplemented.reason}
      />
    );
  }

  // Show error if resource detection failed
  if (!resourceDetection.found) {
    return (
      <Box className={classes.root}>
        <Alert severity="error">
          {resourceDetection.error || 'Failed to detect VCF Operations resource'}
        </Alert>
      </Box>
    );
  }

  const resource = resourceDetection.resource!;

  return (
    <Box className={classes.root}>
      {/* Top Controls */}
      <Card className={classes.topControls}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            VCF Operations Metrics: {resource.resourceKey.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {resource.resourceKey.adapterKindKey} | {resource.resourceKey.resourceKindKey} | ID: {resource.identifier}
          </Typography>
          
          <Box className={classes.topControlsRow}>
            {instances.length > 1 && (
              <Box className={classes.controlGroup}>
                <FormControl className={classes.formControl}>
                  <InputLabel>Instance</InputLabel>
                  <Select
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value as string)}
                  >
                    {instances.map((instance) => (
                      <MenuItem key={instance.name} value={instance.name}>
                        {instance.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box className={classes.controlGroup}>
              <FormControl className={classes.formControl}>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as number)}
                >
                  {TIME_RANGES.map((range) => (
                    <MenuItem key={range.hours} value={range.hours}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box className={classes.controlGroup}>
              <FormControl className={classes.formControl}>
                <InputLabel>Aggregation</InputLabel>
                <Select
                  value={rollUpType}
                  onChange={(e) => setRollUpType(e.target.value as string)}
                >
                  <MenuItem value="AVERAGE">Average</MenuItem>
                  <MenuItem value="MIN">Minimum</MenuItem>
                  <MenuItem value="MAX">Maximum</MenuItem>
                  <MenuItem value="SUM">Sum</MenuItem>
                  <MenuItem value="LATEST">Latest</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box className={classes.controlGroup}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    color="primary"
                  />
                }
                label="Auto-refresh (30s)"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleManualRefresh}
                disabled={loading || isNoneSelected}
                className={classes.refreshButton}
              >
                {loading ? <CircularProgress size={16} /> : 'Refresh Now'}
              </Button>
            </Box>
          </Box>

          {/* Custom Time Range */}
          {timeRange === -1 && (
            <Box className={classes.topControlsRow} style={{ marginTop: 16 }}>
              <TextField
                label="Start Time"
                type="datetime-local"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                style={{ minWidth: 200 }}
              />
              <TextField
                label="End Time"
                type="datetime-local"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                style={{ minWidth: 200 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <Box className={classes.mainContent}>
        {/* Left Panel - Metrics Selection */}
        <Box className={classes.leftPanel}>
          <Card className={classes.metricsCard}>
            <CardHeader 
              title="Available Metrics"
              subheader={`${selectedMetrics.length} of ${allMetrics.length} selected`}
            />
            
            {/* Select All Controls */}
            <Box className={classes.selectAllContainer}>
              <Box display="flex">
                <Button
                  size="small"
                  variant={isAllSelected ? "contained" : "outlined"}
                  color="primary"
                  onClick={handleSelectAll}
                  disabled={isAllSelected}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleDeselectAll}
                  disabled={isNoneSelected}
                  style={{ marginLeft: 8 }}
                >
                  Clear All
                </Button>
              </Box>
            </Box>

            <CardContent className={classes.metricsCardContent}>
              {currentMetricCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.name);
                return (
                  <Box key={category.name}>
                    <Box 
                      className={classes.categoryHeaderContainer}
                      onClick={() => toggleCategoryExpansion(category.name)}
                    >
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryExpansion(category.name);
                        }}
                      >
                        {isExpanded ? <ExpandMore /> : <ChevronRight />}
                      </IconButton>
                      <Checkbox
                        checked={isCategorySelected(category)}
                        indeterminate={isCategoryPartiallySelected(category)}
                        color="primary"
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleCategoryToggle(category)}
                      />
                      <Typography variant="subtitle2" className={classes.categoryTitle}>
                        {category.name} ({category.metrics.filter(m => selectedMetrics.some(sm => sm.key === m.key)).length}/{category.metrics.length})
                      </Typography>
                    </Box>
                    <Collapse in={isExpanded}>
                      {category.metrics.map((metric) => {
                        const isSelected = selectedMetrics.some(m => m.key === metric.key);
                        return (
                          <Box 
                            key={metric.key} 
                            className={classes.metricItem}
                            onClick={() => handleMetricToggle(metric)}
                            style={{ cursor: 'pointer' }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isSelected}
                                  color="primary"
                                  className={classes.metricCheckbox}
                                />
                              }
                              label={metric.label}
                              style={{ width: '100%', margin: 0 }}
                            />
                          </Box>
                        );
                      })}
                    </Collapse>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Box>

        {/* Right Panel - Charts */}
        <Box className={classes.rightPanel}>
          {error && (
            <Alert severity="error" style={{ marginBottom: 16 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box className={classes.loadingContainer}>
              <CircularProgress />
              <Typography variant="body2" style={{ marginTop: 16 }}>
                Loading metrics data...
              </Typography>
            </Box>
          )}

          <Box className={classes.chartsContainer}>
            {metricsData.length > 0 && selectedMetrics.map((metric) => {
              const metricData = metricsData.find(
                (data) => data.stat.statKey.key === metric.key
              );

              return (
                <Card key={metric.key} className={classes.chartCard}>
                  <CardHeader 
                    title={metric.label}
                    subheader={`Resource: ${resource.resourceKey.name}`}
                  />
                  <CardContent style={{ height: 'calc(100% - 72px)' }}>
                    {metricData ? (
                      <MetricChart
                        data={metricData}
                        height={300}
                      />
                    ) : (
                      <Box className={classes.loadingContainer}>
                        <Typography variant="body2" color="textSecondary">
                          No data available for this metric
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {metricsData.length === 0 && selectedMetrics.length > 0 && !loading && !error && (
              <Alert severity="info">
                Metrics will load automatically when you select them.
              </Alert>
            )}

            {selectedMetrics.length === 0 && (
              <Alert severity="info">
                Select metrics from the left panel to view their data.
              </Alert>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};