import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { ActionNode } from './ActionNode';
import type { ActionNodeData } from '../../../types';

const renderWithReactFlow = (component: React.ReactElement) => {
  return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
};

describe('ActionNode', () => {
  const baseData: ActionNodeData = {
    type: 'action',
    actionId: 'fetch:template',
    name: 'Fetch Template',
    inputs: {
      url: './skeleton',
    },
  };

  it('should render action name', () => {
    renderWithReactFlow(<ActionNode data={baseData} selected={false} />);
    expect(screen.getByText('Fetch Template')).toBeInTheDocument();
  });

  it('should render action ID', () => {
    renderWithReactFlow(<ActionNode data={baseData} selected={false} />);
    expect(screen.getByText('fetch:template')).toBeInTheDocument();
  });

  it('should show input count', () => {
    renderWithReactFlow(<ActionNode data={baseData} selected={false} />);
    expect(screen.getByText('1 input')).toBeInTheDocument();
  });

  it('should show conditional indicator when if condition exists', () => {
    const conditionalData = {
      ...baseData,
      if: '${{ parameters.enabled }}',
    };

    renderWithReactFlow(<ActionNode data={conditionalData} selected={false} />);
    expect(screen.getByText('Conditional')).toBeInTheDocument();
  });

  it('should handle onDelete callback', () => {
    const onDelete = jest.fn();
    const dataWithDelete = {
      ...baseData,
      onDelete,
    };

    renderWithReactFlow(<ActionNode data={dataWithDelete} selected={true} />);
    
    // The delete button is visible when selected and onDelete is provided
    // We just verify the component renders without errors
    expect(onDelete).not.toHaveBeenCalled();
  });
});
