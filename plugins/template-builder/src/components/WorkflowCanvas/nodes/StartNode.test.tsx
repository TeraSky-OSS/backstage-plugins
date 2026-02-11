import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { StartNode } from './StartNode';

const renderWithReactFlow = (component: React.ReactElement) => {
  return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
};

describe('StartNode', () => {
  it('should render start label', () => {
    renderWithReactFlow(<StartNode />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('should have output handle', () => {
    const { container } = renderWithReactFlow(<StartNode />);
    expect(container.querySelector('.react-flow__handle')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    const { container } = renderWithReactFlow(<StartNode />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
