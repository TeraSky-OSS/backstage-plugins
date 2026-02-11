import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { OutputGroupNode } from './OutputGroupNode';
import type { OutputGroupNodeData } from '../../../types';

const renderWithReactFlow = (component: React.ReactElement) => {
  return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
};

describe('OutputGroupNode', () => {
  const baseData: OutputGroupNodeData = {
    type: 'output-group',
    outputs: [
      { title: 'Repository URL', url: '${{ steps.publish.output.remoteUrl }}', stepRefs: ['publish'] },
      { title: 'Pull Request', url: '${{ steps.create-pr.output.prUrl }}', stepRefs: ['create-pr'] },
    ],
  };

  it('should render output group title', () => {
    renderWithReactFlow(<OutputGroupNode data={baseData} selected={false} />);
    expect(screen.getByText('Template Outputs')).toBeInTheDocument();
  });

  it('should render all outputs', () => {
    renderWithReactFlow(<OutputGroupNode data={baseData} selected={false} />);
    expect(screen.getByText('Repository URL')).toBeInTheDocument();
    expect(screen.getByText('Pull Request')).toBeInTheDocument();
  });

  it('should handle empty outputs', () => {
    const emptyData: OutputGroupNodeData = {
      type: 'output-group',
      outputs: [],
    };
    renderWithReactFlow(<OutputGroupNode data={emptyData} selected={false} />);
    expect(screen.getByText('Template Outputs')).toBeInTheDocument();
  });

  it('should apply horizontal layout styles', () => {
    const horizontalData: OutputGroupNodeData = {
      ...baseData,
      layoutDirection: 'horizontal',
    };
    const { container } = renderWithReactFlow(<OutputGroupNode data={horizontalData} selected={false} />);
    expect(container).toBeInTheDocument();
  });

  it('should show output count chip', () => {
    renderWithReactFlow(<OutputGroupNode data={baseData} selected={false} />);
    expect(screen.getByText('2 outputs')).toBeInTheDocument();
  });
});
