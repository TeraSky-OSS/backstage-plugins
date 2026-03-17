# VCF Operations Frontend Plugin

The VCF Operations Frontend plugin provides a comprehensive metrics visualization interface for monitoring VMware VCF Operations data within Backstage. It offers an intuitive, feature-rich dashboard for analyzing infrastructure performance and resource utilization.

## Overview

The frontend plugin delivers a powerful metrics exploration experience with:

- **Interactive Metrics Dashboard**: Real-time visualization of infrastructure metrics
- **Categorized Metric Selection**: Organized categories for easy metric discovery
- **Flexible Time Controls**: Customizable time ranges and aggregation options
- **Automatic Resource Detection**: Intelligent mapping of Backstage entities to VCF Operations resources
- **Responsive Design**: Optimized for both desktop and mobile viewing
- **Theme Support**: Full compatibility with light and dark themes

## Core Components

### VCFOperationsExplorer

The main component providing the complete metrics exploration interface:

```typescript
import { VCFOperationsExplorerComponent } from '@terasky/backstage-plugin-vcf-operations';

<VCFOperationsExplorerComponent />
```

## User Interface Layout

### Top Control Bar
The control bar provides essential configuration options:

- **Instance Selection**: Choose between multiple VCF Operations instances
- **Time Range**: Select from predefined ranges or custom time periods
- **Aggregation Method**: Choose data aggregation (Average, Min, Max, Sum, Latest)
- **Auto-refresh**: Toggle automatic data refresh every 30 seconds
- **Manual Refresh**: On-demand data refresh button

### Left Panel - Metrics Selection
Organized metric categories with intelligent selection controls:

#### Category Structure
- **CPU Metrics**: Usage percentage, MHz, ready time, co-stop
- **Memory Metrics**: Usage percentage, consumed KB
- **Storage Metrics**: Disk usage, datastore utilization
- **Network Metrics**: Network usage in KBps
- **System Health**: Health scores, badges, availability
- **Alerts & Monitoring**: Alert counts by severity level
- **Power & Environment**: Power consumption metrics

#### Selection Features
- **Category Checkboxes**: Select/deselect entire metric categories
- **Individual Metric Toggles**: Fine-grained metric selection
- **Select All/Clear All**: Bulk selection controls
- **Visual Indicators**: Selection counts and progress indicators
- **Indeterminate States**: Category checkboxes show partial selection

### Right Panel - Chart Visualization
Dynamic chart area with responsive layout:

- **Time-Series Charts**: Interactive line charts with zoom and pan
- **Multiple Metrics**: Simultaneous display of selected metrics
- **Chart Controls**: Individual chart legends and tooltips
- **Responsive Layout**: Adaptive sizing for different screen sizes
- **Scroll Support**: Vertical scrolling for multiple charts

## Metric Categories

### CPU Metrics
Monitor processor performance and utilization:

- **CPU Usage (%)**: Percentage of CPU utilization
- **CPU Usage (MHz)**: CPU usage in megahertz
- **CPU Ready (ms)**: Time spent waiting for CPU resources
- **CPU Co-Stop (ms)**: Time spent in co-scheduling delays

### Memory Metrics
Track memory utilization and consumption:

- **Memory Usage (%)**: Percentage of memory utilization
- **Memory Consumed (KB)**: Actual memory consumption in kilobytes

### Storage Metrics
Monitor storage performance and capacity:

- **Disk Usage (%)**: Disk utilization percentage
- **Datastore Usage (%)**: Datastore capacity utilization

### Network Metrics
Analyze network performance and throughput:

- **Network Usage (KBps)**: Network throughput in kilobytes per second

### System Health Metrics
Overall system health and status indicators:

- **Health Score**: Overall system health rating
- **Health Badge**: Health status badge
- **Efficiency Badge**: System efficiency indicator
- **Risk Badge**: Risk assessment indicator
- **Compliance Badge**: Compliance status
- **Availability**: System availability percentage

### Alerts & Monitoring
Alert and notification metrics:

- **Total Alerts**: Total number of active alerts
- **Critical Alerts**: Number of critical severity alerts
- **Warning Alerts**: Number of warning severity alerts
- **Info Alerts**: Number of informational alerts

### Power & Environment
Environmental and power consumption metrics:

- **Power Usage (W)**: Power consumption in watts

## Resource Detection Logic

The frontend automatically detects VCF Operations resources based on entity metadata:

### Virtual Machines

#### Standalone VMs
- **Detection**: Entities with `kind:virtualmachine` and `standalone-resource` tags
- **Name Extraction**: Removes " (Standalone)" suffix from entity title
- **Example**: "my-vm (Standalone)" → searches for "my-vm"

#### Non-Standalone VMs
- **Detection**: Entities with `kind:virtualmachine` tag (without `standalone-resource`)
- **Name Extraction**: Parses "Open Remote Console" link from entity metadata
- **URL Parsing**: Extracts last segment from remote console URL
- **Example**: `/machines/remote-console/vra/cluster/vm-name` → searches for "vm-name"

### Supervisor Namespaces
- **Detection**: Entities with `terasky.backstage.io/vcf-automation-cci-namespace-endpoint` annotation
- **URN Extraction**: Parses namespace URN from CCI endpoint URL
- **Property Matching**: Matches against `summary|vcfa_ns_uuid` property in VCF Operations

### VCF Automation Projects
- **Detection**: Domain entities with type `vcf-automation-project`
- **Name Matching**: Direct mapping of entity title to VCF Operations resource name

### Planned Support
- **Clusters**: Kubernetes cluster resources (development in progress)
- **Deployments**: Application deployment resources (development in progress)

## User Experience Features

### Smart Defaults
- **Pre-selected Metrics**: CPU, Memory, and Network usage automatically selected
- **Default Time Range**: 24-hour view for immediate insights
- **Automatic Loading**: Metrics load immediately upon selection

### Interactive Controls
- **One-Click Category Selection**: Select entire metric categories with single click
- **Bulk Operations**: Select all or clear all metrics quickly
- **Real-time Updates**: Automatic refresh with configurable intervals
- **Manual Refresh**: On-demand data refresh for immediate updates

### Visual Feedback
- **Loading Indicators**: Clear feedback during data loading
- **Error Messages**: Helpful error descriptions with suggested actions
- **Progress Indicators**: Selection counts and status information
- **Hover Effects**: Interactive elements with visual feedback

### Responsive Design
- **Mobile Support**: Optimized layout for mobile and tablet devices
- **Flexible Panels**: Resizable and collapsible interface elements
- **Adaptive Charts**: Charts resize based on available space
- **Theme Integration**: Seamless integration with Backstage themes

## API Integration

### VCF Operations Client
The frontend communicates with the backend through a dedicated API client:

```typescript
interface VcfOperationsApi {
  getInstances(): Promise<Instance[]>;
  findResourceByName(name: string, instance?: string): Promise<Resource | null>;
  findResourceByProperty(key: string, value: string, instance?: string): Promise<Resource | null>;
  getResourceMetrics(
    resourceId: string,
    statKeys: string[],
    begin?: number,
    end?: number,
    rollUpType?: string,
    instance?: string
  ): Promise<StatsResponse>;
}
```

### Error Handling
Comprehensive error handling with user-friendly messages:

- **Connection Errors**: Network connectivity issues
- **Authentication Errors**: Invalid credentials or permissions
- **Resource Not Found**: Missing resources with helpful suggestions
- **Invalid Metrics**: Unsupported metric keys with alternatives
- **Time Range Errors**: Invalid time ranges with automatic correction

## Performance Optimizations

### Efficient Data Loading
- **Automatic Loading**: Metrics load when selected, eliminating manual refresh
- **Debounced Requests**: Prevents excessive API calls during rapid selections
- **Caching Strategy**: Intelligent caching of resource metadata
- **Progressive Loading**: Charts render as data becomes available

### Memory Management
- **Component Optimization**: Efficient React component lifecycle management
- **Chart Cleanup**: Proper cleanup of chart instances and event listeners
- **State Management**: Optimized state updates and re-renders

### Network Efficiency
- **Batch Requests**: Multiple metrics requested in single API calls
- **Request Cancellation**: Cleanup of obsolete requests when selections change
- **Compression**: Efficient data transfer with response compression

## Accessibility Features

### Keyboard Navigation
- **Tab Navigation**: Full keyboard navigation support
- **Focus Management**: Clear focus indicators and logical tab order
- **Keyboard Shortcuts**: Efficient navigation with keyboard shortcuts

### Screen Reader Support
- **ARIA Labels**: Comprehensive ARIA labeling for screen readers
- **Semantic HTML**: Proper HTML structure for accessibility
- **Alt Text**: Descriptive alternative text for visual elements

### Visual Accessibility
- **High Contrast**: Compatible with high contrast themes
- **Color Blind Support**: Color schemes accessible to color blind users
- **Scalable Text**: Respects user font size preferences

The VCF Operations Frontend plugin provides a comprehensive, user-friendly interface for monitoring VCF infrastructure, enabling teams to quickly identify performance issues and optimize resource utilization through intuitive visualizations and intelligent automation.