import { render, screen } from '@testing-library/react';
import { NotImplementedMessage } from './NotImplementedMessage';

jest.mock('@material-ui/core/styles', () => ({
  ...jest.requireActual('@material-ui/core/styles'),
  makeStyles: () => () => ({
    root: 'root',
    card: 'card',
    icon: 'icon',
    comingSoonChip: 'comingSoonChip',
  }),
}));

describe('NotImplementedMessage', () => {
  it('should render the component with entity type', () => {
    render(
      <NotImplementedMessage
        entityType="Virtual Machine"
        reason="VM metrics require additional configuration"
      />
    );

    expect(screen.getByText(/VCF Operations Metrics - Coming Soon/)).toBeInTheDocument();
    expect(screen.getByText(/Virtual Machine/)).toBeInTheDocument();
    expect(screen.getByText(/VM metrics require additional configuration/)).toBeInTheDocument();
  });

  it('should render entity kind when provided', () => {
    render(
      <NotImplementedMessage
        entityType="Resource"
        entityKind="StatefulSet"
        reason="StatefulSet metrics coming soon"
      />
    );

    expect(screen.getByText(/of kind/)).toBeInTheDocument();
  });

  it('should display Coming Soon chip', () => {
    render(
      <NotImplementedMessage
        entityType="Test"
        reason="Test reason"
      />
    );

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('should display Feature In Development title', () => {
    render(
      <NotImplementedMessage
        entityType="Test"
        reason="Test reason"
      />
    );

    expect(screen.getByText('Feature In Development')).toBeInTheDocument();
  });
});

