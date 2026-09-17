import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Flex,
  Select,
  Text,
} from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { vcfOperationsApiRef, MetricData, Resource, VcfOperationsApiError, VcfOperationsInstance } from '../api/VcfOperationsClient';
import { MetricChart } from './MetricChart';
import { NotImplementedMessage } from './NotImplementedMessage';
import styles from './VCFOperationsExplorer.module.css';

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
  const vcfOperationsApi = useApi(vcfOperationsApiRef);
  const { entity } = useEntity();

  // Get entity type and tags to determine resource kind
  const entityType = entity.spec?.type as string;
  const entityTags = entity.metadata.tags || [];
  
  // Get appropriate metric categories based on resource kind
  const currentMetricCategories = getMetricCategoriesForKind(entityType, entityTags);
  const allMetrics = getAllMetricsFromCategories(currentMetricCategories);

  // Default selected metrics based on resource kind
  const getDefaultMetrics = (resourceType?: string, tags?: string[]): MetricSelection[] => {
    if (resourceType === 'CCI.Supervisor.Namespace') {
      return [
        { key: 'badge|health', label: 'Health Badge' },
        { key: 'badge|compliance', label: 'Compliance Badge' },
        { key: 'cpu|effective_usagemhz_average', label: 'Effective CPU Usage (MHz)' },
        { key: 'mem|consumed_average', label: 'Memory Consumed (KB)' },
      ];
    }
    if (resourceType === 'vcf-automation-project') {
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
        const detectedEntityType = entity.spec?.type as string;
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
        if (detectedEntityType === 'CCI.Supervisor.Namespace') {
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
        if (detectedEntityType === 'Cloud.vSphere.Machine') {
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
        if (entityKind.toLowerCase() === 'domain' && detectedEntityType === 'vcf-automation-project') {
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
        if (entityKind.toLowerCase() === 'system' && detectedEntityType === 'deployment') {
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
          error: `No direct VCF Operations resource mapping found for this entity type (${entityKind}:${detectedEntityType}).`,
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
      // eslint-disable-next-line no-console
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } 
        // Select all metrics in this category (add any that aren't already selected)
        const newMetrics = category.metrics.filter(metric => 
          !prev.some(selected => selected.key === metric.key)
        );
        return [...prev, ...newMetrics];
      
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
      <Box className={styles.root}>
        <Card>
          <CardBody>
            <Alert
              status="info"
              title="Select a VCF Operations Instance"
              description={
                <Flex direction="column" gap="2">
                  <Text>Multiple VCF Operations instances are available. Please select one to view metrics:</Text>
                  {vcfaInstanceName && (
                    <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                      Note: Could not automatically match VCF Automation instance "{vcfaInstanceName}" to a VCF Operations instance.
                      Check that the instance is listed in the relatedVCFAInstances configuration.
                    </Text>
                  )}
                  <Box style={{ marginTop: 'var(--bui-space-4)', maxWidth: 300 }}>
                    <Select
                      label="Instance"
                      selectedKey={selectedInstance || undefined}
                      onSelectionChange={key => setSelectedInstance(String(key))}
                      options={instances.map(instance => ({
                        id: instance.name,
                        label: instance.relatedVCFAInstances && instance.relatedVCFAInstances.length > 0
                          ? `${instance.name} (${instance.relatedVCFAInstances.join(', ')})`
                          : instance.name,
                      }))}
                    />
                  </Box>
                </Flex>
              }
            />
          </CardBody>
        </Card>
      </Box>
    );
  }

  // Show loading while detecting resource
  if (detectingResource) {
    return (
      <Box className={styles.root}>
        <Card>
          <CardBody>
            <div className={styles.loadingContainer}>
              <Progress />
              <Text style={{ marginTop: 'var(--bui-space-4)' }}>
                Detecting VCF Operations resource...
              </Text>
            </div>
          </CardBody>
        </Card>
      </Box>
    );
  }

  // Show permission error if user doesn't have access
  if (resourceDetection.permissionError) {
    return (
      <Box className={styles.root}>
        <Card>
          <CardBody>
            <Alert
              status="danger"
              title="Access Denied"
              description={
                <Flex direction="column" gap="2">
                  <Text>{resourceDetection.error}</Text>
                  <Text>Please contact your administrator to request access to VCF Operations metrics.</Text>
                </Flex>
              }
            />
          </CardBody>
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
      <Box className={styles.root}>
        <Alert
          status="danger"
          description={resourceDetection.error || 'Failed to detect VCF Operations resource'}
        />
      </Box>
    );
  }

  const resource = resourceDetection.resource!;

  return (
    <Box className={styles.root}>
      {/* Top Controls */}
      <Card className={styles.topControls}>
        <CardBody>
          <Text variant="title-small" weight="bold" style={{ display: 'block' }}>
            VCF Operations Metrics: {resource.resourceKey.name}
          </Text>
          <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            {resource.resourceKey.adapterKindKey} | {resource.resourceKey.resourceKindKey} | ID: {resource.identifier}
          </Text>

          <div className={styles.topControlsRow}>
            {instances.length > 1 && (
              <div className={styles.controlGroup}>
                <Select
                  label="Instance"
                  size="small"
                  selectedKey={selectedInstance || undefined}
                  onSelectionChange={key => setSelectedInstance(String(key))}
                  options={instances.map(instance => ({ id: instance.name, label: instance.name }))}
                />
              </div>
            )}

            <div className={styles.controlGroup}>
              <Select
                label="Time Range"
                size="small"
                selectedKey={String(timeRange)}
                onSelectionChange={key => setTimeRange(Number(key))}
                options={TIME_RANGES.map(range => ({ id: String(range.hours), label: range.label }))}
              />
            </div>

            <div className={styles.controlGroup}>
              <Select
                label="Aggregation"
                size="small"
                selectedKey={rollUpType}
                onSelectionChange={key => setRollUpType(String(key))}
                options={[
                  { id: 'AVERAGE', label: 'Average' },
                  { id: 'MIN', label: 'Minimum' },
                  { id: 'MAX', label: 'Maximum' },
                  { id: 'SUM', label: 'Sum' },
                  { id: 'LATEST', label: 'Latest' },
                ]}
              />
            </div>

            <div className={styles.controlGroup}>
              <Checkbox
                isSelected={autoRefresh}
                onChange={setAutoRefresh}
              >
                Auto-refresh (30s)
              </Checkbox>
              <Button
                variant="secondary"
                size="small"
                onPress={handleManualRefresh}
                isDisabled={loading || isNoneSelected}
                isPending={loading}
              >
                Refresh Now
              </Button>
            </div>
          </div>

          {/* Custom Time Range */}
          {timeRange === -1 && (
            <Flex gap="4" style={{ marginTop: 'var(--bui-space-4)', flexWrap: 'wrap' }}>
              <label>
                <Text variant="body-small" style={{ display: 'block', marginBottom: 'var(--bui-space-1)' }}>Start Time</Text>
                <input
                  type="datetime-local"
                  value={customStartTime}
                  onChange={e => setCustomStartTime(e.target.value)}
                  style={{
                    minWidth: 200,
                    padding: 'var(--bui-space-2)',
                    borderRadius: 'var(--bui-radius-2)',
                    border: '1px solid var(--bui-border-1)',
                    background: 'var(--bui-bg-app)',
                    color: 'var(--bui-fg-primary)',
                  }}
                />
              </label>
              <label>
                <Text variant="body-small" style={{ display: 'block', marginBottom: 'var(--bui-space-1)' }}>End Time</Text>
                <input
                  type="datetime-local"
                  value={customEndTime}
                  onChange={e => setCustomEndTime(e.target.value)}
                  style={{
                    minWidth: 200,
                    padding: 'var(--bui-space-2)',
                    borderRadius: 'var(--bui-radius-2)',
                    border: '1px solid var(--bui-border-1)',
                    background: 'var(--bui-bg-app)',
                    color: 'var(--bui-fg-primary)',
                  }}
                />
              </label>
            </Flex>
          )}
        </CardBody>
      </Card>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Left Panel - Metrics Selection */}
        <div className={styles.leftPanel}>
          <Card className={styles.metricsCard}>
            <CardHeader>
              <Text weight="bold" style={{ display: 'block' }}>Available Metrics</Text>
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                {selectedMetrics.length} of {allMetrics.length} selected
              </Text>
            </CardHeader>

            {/* Select All Controls */}
            <div className={styles.selectAllContainer}>
              <Flex gap="2">
                <Button
                  size="small"
                  variant={isAllSelected ? 'primary' : 'secondary'}
                  onPress={handleSelectAll}
                  isDisabled={isAllSelected}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onPress={handleDeselectAll}
                  isDisabled={isNoneSelected}
                >
                  Clear All
                </Button>
              </Flex>
            </div>

            <CardBody className={styles.metricsCardBody}>
              {currentMetricCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.name);
                return (
                  <Box key={category.name}>
                    <div
                      className={styles.categoryHeaderContainer}
                      onClick={() => toggleCategoryExpansion(category.name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleCategoryExpansion(category.name); }}
                    >
                      <ButtonIcon
                        aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
                        size="small"
                        variant="tertiary"
                        icon={isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                        onPress={() => toggleCategoryExpansion(category.name)}
                      />
                      <Checkbox
                        isSelected={isCategorySelected(category)}
                        isIndeterminate={isCategoryPartiallySelected(category)}
                        onChange={() => handleCategoryToggle(category)}
                      />
                      <Text weight="bold" variant="body-small" className={styles.categoryTitle}>
                        {category.name} ({category.metrics.filter(m => selectedMetrics.some(sm => sm.key === m.key)).length}/{category.metrics.length})
                      </Text>
                    </div>
                    {isExpanded && category.metrics.map((metric) => {
                      const isSelected = selectedMetrics.some(m => m.key === metric.key);
                      return (
                        <div
                          key={metric.key}
                          className={styles.metricItem}
                          onClick={() => handleMetricToggle(metric)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleMetricToggle(metric); }}
                        >
                          <Checkbox isSelected={isSelected} onChange={() => handleMetricToggle(metric)}>
                            {metric.label}
                          </Checkbox>
                        </div>
                      );
                    })}
                  </Box>
                );
              })}
            </CardBody>
          </Card>
        </div>

        {/* Right Panel - Charts */}
        <div className={styles.rightPanel}>
          {error && (
            <Alert status="danger" description={error} style={{ marginBottom: 'var(--bui-space-4)' }} />
          )}

          {loading && (
            <div className={styles.loadingContainer}>
              <Progress />
              <Text style={{ marginTop: 'var(--bui-space-4)' }}>
                Loading metrics data...
              </Text>
            </div>
          )}

          <div className={styles.chartsContainer}>
            {metricsData.length > 0 && selectedMetrics.map((metric) => {
              const metricData = metricsData.find(
                (data) => data.stat.statKey.key === metric.key
              );

              return (
                <Card key={metric.key} className={styles.chartCard}>
                  <CardHeader>
                    <Text weight="bold" style={{ display: 'block' }}>{metric.label}</Text>
                    <Text style={{ color: 'var(--bui-fg-secondary)' }}>Resource: {resource.resourceKey.name}</Text>
                  </CardHeader>
                  <CardBody style={{ height: 'calc(100% - 72px)' }}>
                    {metricData ? (
                      <MetricChart
                        data={metricData}
                        height={300}
                      />
                    ) : (
                      <div className={styles.loadingContainer}>
                        <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                          No data available for this metric
                        </Text>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}

            {metricsData.length === 0 && selectedMetrics.length > 0 && !loading && !error && (
              <Alert status="info" description="Metrics will load automatically when you select them." />
            )}

            {selectedMetrics.length === 0 && (
              <Alert status="info" description="Select metrics from the left panel to view their data." />
            )}
          </div>
        </div>
      </div>
    </Box>
  );
};