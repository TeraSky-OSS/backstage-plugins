import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('should render children in a visually hidden span', () => {
    render(<VisuallyHidden>Hidden Content</VisuallyHidden>);
    
    const element = screen.getByText('Hidden Content');
    expect(element).toBeInTheDocument();
    expect(element.tagName).toBe('SPAN');
  });

  it('should apply visually hidden styles', () => {
    render(<VisuallyHidden>Hidden Content</VisuallyHidden>);
    
    const element = screen.getByText('Hidden Content');
    expect(element).toHaveStyle({
      position: 'absolute',
      overflow: 'hidden',
      height: '1px',
      width: '1px',
    });
  });

  it('should pass through additional props', () => {
    render(<VisuallyHidden data-testid="hidden-element">Content</VisuallyHidden>);
    
    expect(screen.getByTestId('hidden-element')).toBeInTheDocument();
  });

});

