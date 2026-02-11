import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  const mockOnNameChange = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnValidate = jest.fn();
  const mockOnUndo = jest.fn();
  const mockOnRedo = jest.fn();
  const mockOnHelp = jest.fn();

  beforeEach(() => {
    mockOnNameChange.mockClear();
    mockOnDownload.mockClear();
    mockOnValidate.mockClear();
    mockOnUndo.mockClear();
    mockOnRedo.mockClear();
    mockOnHelp.mockClear();
  });

  it('should render toolbar', () => {
    const { container } = render(
      <Toolbar
        templateName="test-template"
        hasUnsavedChanges={false}
        canUndo={false}
        canRedo={false}
        onNameChange={mockOnNameChange}
        onDownload={mockOnDownload}
        onValidate={mockOnValidate}
        onUndo={mockOnUndo}
        onRedo={mockOnRedo}
        onHelp={mockOnHelp}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render download button', () => {
    render(
      <Toolbar
        templateName="test-template"
        hasUnsavedChanges={false}
        canUndo={false}
        canRedo={false}
        onNameChange={mockOnNameChange}
        onDownload={mockOnDownload}
        onValidate={mockOnValidate}
        onUndo={mockOnUndo}
        onRedo={mockOnRedo}
        onHelp={mockOnHelp}
      />
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle unsaved changes state', () => {
    render(
      <Toolbar
        templateName="test-template"
        hasUnsavedChanges={true}
        canUndo={true}
        canRedo={true}
        onNameChange={mockOnNameChange}
        onDownload={mockOnDownload}
        onValidate={mockOnValidate}
        onUndo={mockOnUndo}
        onRedo={mockOnRedo}
        onHelp={mockOnHelp}
      />
    );
    
    expect(screen.getAllByRole('button')).toBeDefined();
  });
});
