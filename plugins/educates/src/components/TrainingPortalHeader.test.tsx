import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainingPortalHeader } from './TrainingPortalHeader';
import { TrainingPortalStatus } from '@terasky/backstage-plugin-educates-common';

// Mock Material-UI styles
jest.mock('@material-ui/core/styles', () => ({
  ...jest.requireActual('@material-ui/core/styles'),
  makeStyles: () => () => ({
    labelContainer: 'labelContainer',
    label: 'label',
    headerContainer: 'headerContainer',
    logo: 'logo',
    titleSection: 'titleSection',
    expandButton: 'expandButton',
    workshopCount: 'workshopCount',
    contentSection: 'contentSection',
  }),
}));

const mockPortal: TrainingPortalStatus = {
  name: 'test-portal',
  title: 'Test Portal',
  url: 'http://test-portal.example.com',
  logo: 'data:image/png;base64,testlogo',
  sessions: {
    allocated: 3,
    maximum: 10,
  },
  labels: {
    team: 'platform',
    environment: 'production',
  },
};

describe('TrainingPortalHeader', () => {
  const defaultProps = {
    portal: mockPortal,
    workshopCount: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render portal title', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    expect(screen.getByText(/Test Portal/)).toBeInTheDocument();
  });

  it('should render portal name when title is not provided', () => {
    const portalNoTitle = { ...mockPortal, title: undefined };
    render(<TrainingPortalHeader portal={portalNoTitle} workshopCount={3} />);
    expect(screen.getByText(/test-portal/)).toBeInTheDocument();
  });

  it('should display workshop count', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    expect(screen.getByText(/5 workshops/)).toBeInTheDocument();
  });

  it('should display singular workshop when count is 1', () => {
    render(<TrainingPortalHeader {...defaultProps} workshopCount={1} />);
    expect(screen.getByText(/1 workshop\)/)).toBeInTheDocument();
  });

  it('should display session information', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    expect(screen.getByText(/Active Sessions: 3 \/ 10/)).toBeInTheDocument();
  });

  it('should display Unlimited when maximum sessions is not set', () => {
    const portalUnlimited = { ...mockPortal, sessions: { allocated: 2, maximum: undefined } };
    render(<TrainingPortalHeader portal={portalUnlimited} workshopCount={3} />);
    expect(screen.getByText(/Active Sessions: 2 \/ Unlimited/)).toBeInTheDocument();
  });

  it('should render logo when provided', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    const logo = screen.getByRole('img');
    expect(logo).toBeInTheDocument();
  });

  it('should not render logo when not provided', () => {
    const portalNoLogo = { ...mockPortal, logo: undefined };
    render(<TrainingPortalHeader portal={portalNoLogo} workshopCount={3} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should be collapsed by default', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    expect(screen.queryByText('team: platform')).not.toBeInTheDocument();
  });

  it('should expand when expand button is clicked', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);
    
    expect(screen.getByText('team: platform')).toBeInTheDocument();
    expect(screen.getByText('environment: production')).toBeInTheDocument();
  });

  it('should collapse when collapse button is clicked', () => {
    render(<TrainingPortalHeader {...defaultProps} />);
    
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton); // expand
    expect(screen.getByText('team: platform')).toBeInTheDocument();
    
    const collapseButton = screen.getByLabelText('Collapse');
    fireEvent.click(collapseButton); // collapse
    expect(screen.queryByText('team: platform')).not.toBeInTheDocument();
  });

  it('should render children when expanded', () => {
    render(
      <TrainingPortalHeader {...defaultProps}>
        <div data-testid="child-content">Child Content</div>
      </TrainingPortalHeader>
    );
    
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should not render labels section when labels are empty', () => {
    const portalNoLabels = { ...mockPortal, labels: {} };
    render(<TrainingPortalHeader portal={portalNoLabels} workshopCount={3} />);
    
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);
    
    expect(screen.queryByText('team:')).not.toBeInTheDocument();
  });
});

