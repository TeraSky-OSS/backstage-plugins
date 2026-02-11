import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParameterList } from './ParameterList';
import type { ParameterStep } from '../../types';

describe('ParameterList', () => {
  const mockOnSelectField = jest.fn();
  const mockOnDeleteField = jest.fn();
  const mockOnUpdateStep = jest.fn();

  const mockParameterStep: ParameterStep = {
    id: 'step1',
    title: 'Fill in some information',
    properties: {
      repoName: {
        title: 'Repository Name',
        type: 'string',
        description: 'Name of the repository',
      },
      owner: {
        title: 'Owner',
        type: 'string',
      },
    },
    required: ['repoName'],
  };

  beforeEach(() => {
    mockOnSelectField.mockClear();
    mockOnDeleteField.mockClear();
    mockOnUpdateStep.mockClear();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <ParameterList
        step={mockParameterStep}
        stepIndex={0}
        onSelectField={mockOnSelectField}
        onDeleteField={mockOnDeleteField}
        onUpdateStep={mockOnUpdateStep}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render with empty properties', () => {
    const emptyStep: ParameterStep = {
      id: 'step2',
      title: 'Empty Step',
      properties: {},
      required: [],
    };
    
    const { container } = render(
      <ParameterList
        step={emptyStep}
        stepIndex={0}
        onSelectField={mockOnSelectField}
        onDeleteField={mockOnDeleteField}
        onUpdateStep={mockOnUpdateStep}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render with selected field', () => {
    const { container } = render(
      <ParameterList
        step={mockParameterStep}
        stepIndex={0}
        selectedField="repoName"
        onSelectField={mockOnSelectField}
        onDeleteField={mockOnDeleteField}
        onUpdateStep={mockOnUpdateStep}
      />
    );
    
    expect(container).toBeInTheDocument();
  });
});
