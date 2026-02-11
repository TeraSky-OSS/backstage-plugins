import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ValidateButton } from './ValidateButton';
import type { ValidationError } from '../../api/types';

describe('ValidateButton', () => {
  it('should render without crashing', () => {
    const mockOnValidate = () => [];
    const { container } = render(<ValidateButton onValidate={mockOnValidate} />);
    
    expect(container).toBeInTheDocument();
  });

  it('should render with validation errors', () => {
    const errors: ValidationError[] = [
      { severity: 'error', message: 'Error 1', path: 'metadata.name' },
      { severity: 'error', message: 'Error 2', path: 'spec.steps' },
    ];
    const mockOnValidate = () => errors;
    
    const { container } = render(<ValidateButton onValidate={mockOnValidate} />);
    
    expect(container).toBeInTheDocument();
  });

  it('should render button element', () => {
    const mockOnValidate = () => [];
    render(<ValidateButton onValidate={mockOnValidate} />);
    
    const button = screen.queryByRole('button');
    expect(button).toBeInTheDocument();
  });
});
