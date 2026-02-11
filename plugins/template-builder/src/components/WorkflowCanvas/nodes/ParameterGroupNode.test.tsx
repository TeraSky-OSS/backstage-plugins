import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { ParameterGroupNode } from './ParameterGroupNode';
import type { ParameterGroupNodeData } from '../../../types';

const renderWithReactFlow = (component: React.ReactElement) => {
  return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
};

describe('ParameterGroupNode', () => {
  const baseData: ParameterGroupNodeData = {
    type: 'parameter-group',
    parameters: [
      { name: 'repoName', title: 'Repository Name', usageCount: 2 },
      { name: 'owner', title: 'Owner', usageCount: 1 },
    ],
    totalUsageCount: 3,
  };

  it('should render parameter group title', () => {
    renderWithReactFlow(<ParameterGroupNode data={baseData} selected={false} />);
    expect(screen.getByText('Template Parameters')).toBeInTheDocument();
  });

  it('should render all parameters as chips', () => {
    const { container } = renderWithReactFlow(<ParameterGroupNode data={baseData} selected={false} />);
    const chips = container.querySelectorAll('.MuiChip-root');
    // At least parameters + reference count chip
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });

  it('should show total reference count', () => {
    renderWithReactFlow(<ParameterGroupNode data={baseData} selected={false} />);
    expect(screen.getByText('3 references')).toBeInTheDocument();
  });

  it('should handle empty parameters', () => {
    const emptyData: ParameterGroupNodeData = {
      type: 'parameter-group',
      parameters: [],
      totalUsageCount: 0,
    };
    renderWithReactFlow(<ParameterGroupNode data={emptyData} selected={false} />);
    expect(screen.getByText('Template Parameters')).toBeInTheDocument();
  });

  it('should apply horizontal layout styles', () => {
    const horizontalData: ParameterGroupNodeData = {
      ...baseData,
      layoutDirection: 'horizontal',
    };
    const { container } = renderWithReactFlow(<ParameterGroupNode data={horizontalData} selected={false} />);
    expect(container).toBeInTheDocument();
  });
});
