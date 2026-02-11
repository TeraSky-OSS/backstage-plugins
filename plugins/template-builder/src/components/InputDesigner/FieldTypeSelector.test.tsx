import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FieldTypeSelector } from './FieldTypeSelector';

describe('FieldTypeSelector', () => {
  const mockOnChange = jest.fn();
  const mockFieldExtensions = ['EntityPicker', 'RepoUrlPicker', 'OwnerPicker'];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <FieldTypeSelector
        value="string"
        availableExtensions={mockFieldExtensions}
        onChange={mockOnChange}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render with custom field type', () => {
    const { container } = render(
      <FieldTypeSelector
        value="string"
        customFieldType="EntityPicker"
        availableExtensions={mockFieldExtensions}
        onChange={mockOnChange}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render with empty extensions', () => {
    const { container } = render(
      <FieldTypeSelector
        value="string"
        availableExtensions={[]}
        onChange={mockOnChange}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render with different types', () => {
    const types = ['string', 'number', 'boolean', 'array', 'object'];
    
    types.forEach(type => {
      const { container } = render(
        <FieldTypeSelector
          value={type}
          availableExtensions={mockFieldExtensions}
          onChange={mockOnChange}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
