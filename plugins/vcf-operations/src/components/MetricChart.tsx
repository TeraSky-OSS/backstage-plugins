import { FC, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Flex, Text } from '@backstage/ui';
import { MetricData } from '../api/VcfOperationsClient';

interface MetricChartProps {
  data: MetricData;
  height?: number;
}

interface ChartDataPoint {
  timestamp: number;
  value: number;
  formattedTime: string;
}

export const MetricChart: FC<MetricChartProps> = ({ 
  data, 
  height = 300 
}) => {
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data.stat.timestamps || !data.stat.data) {
      return [];
    }

    return data.stat.timestamps.map((timestamp, index) => ({
      timestamp,
      value: data.stat.data[index] || 0,
      formattedTime: new Date(timestamp).toLocaleString(),
    }));
  }, [data]);

  const formatTooltipValue = (value: number) => {
    // Format large numbers with appropriate units
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    } else if (value < 1 && value > 0) {
      return value.toFixed(3);
    }
    return value.toFixed(2);
  };

  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100];
    
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    
    return [
      Math.max(0, min - padding),
      max + padding
    ];
  };

  if (chartData.length === 0) {
    return (
      <Flex align="center" justify="center" style={{ height }}>
        <Text style={{ color: 'var(--bui-fg-secondary)' }}>
          No data available
        </Text>
      </Flex>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxisLabel}
          />
          <YAxis
            domain={getYAxisDomain()}
            tickFormatter={formatTooltipValue}
          />
          <Tooltip
            labelFormatter={(timestamp: number) => 
              new Date(timestamp).toLocaleString()
            }
            formatter={(value: number) => [
              formatTooltipValue(value),
              data.stat.statKey.key
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            name={data.stat.statKey.key}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};