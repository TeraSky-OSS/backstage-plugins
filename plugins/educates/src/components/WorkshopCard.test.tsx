import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkshopCard } from './WorkshopCard';
import { Workshop } from '@terasky/backstage-plugin-educates-common';

// Mock the permission hook
jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn().mockReturnValue({ allowed: true, loading: false }),
}));

// Mock Material-UI components to prevent style issues
jest.mock('@material-ui/core/styles', () => ({
  ...jest.requireActual('@material-ui/core/styles'),
  makeStyles: () => () => ({
    root: 'root',
    chipContainer: 'chipContainer',
    infoChips: 'infoChips',
    tagChips: 'tagChips',
    statsContainer: 'statsContainer',
    startButton: 'startButton',
    content: 'content',
    description: 'description',
  }),
}));

const mockWorkshop: Workshop = {
  name: 'test-workshop',
  title: 'Test Workshop',
  description: 'A test workshop description',
  vendor: 'Test Vendor',
  difficulty: 'Beginner',
  duration: '30m',
  tags: ['kubernetes', 'docker'],
  environment: {
    capacity: 10,
    allocated: 3,
  },
};

describe('WorkshopCard', () => {
  const defaultProps = {
    workshop: mockWorkshop,
    portalName: 'test-portal',
    onStartWorkshop: jest.fn(),
    enablePermissions: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render workshop title', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('Test Workshop')).toBeInTheDocument();
  });

  it('should render workshop name', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('test-workshop')).toBeInTheDocument();
  });

  it('should render workshop description', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('A test workshop description')).toBeInTheDocument();
  });

  it('should render vendor chip when provided', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
  });

  it('should render difficulty chip when provided', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('should render duration chip when provided', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('30m')).toBeInTheDocument();
  });

  it('should render tags', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('kubernetes')).toBeInTheDocument();
    expect(screen.getByText('docker')).toBeInTheDocument();
  });

  it('should display available capacity', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByText('Available: 7 / 10')).toBeInTheDocument();
  });

  it('should render start button', () => {
    render(<WorkshopCard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /start workshop/i })).toBeInTheDocument();
  });

  it('should call onStartWorkshop when button clicked', () => {
    const onStartWorkshop = jest.fn();
    render(<WorkshopCard {...defaultProps} onStartWorkshop={onStartWorkshop} />);
    
    const button = screen.getByRole('button', { name: /start workshop/i });
    fireEvent.click(button);
    
    expect(onStartWorkshop).toHaveBeenCalledTimes(1);
  });

  it('should disable button when no capacity', () => {
    const workshopNoCapacity = {
      ...mockWorkshop,
      environment: { capacity: 5, allocated: 5 },
    };
    render(<WorkshopCard {...defaultProps} workshop={workshopNoCapacity} />);
    
    const button = screen.getByRole('button', { name: /start workshop/i });
    expect(button).toBeDisabled();
  });

  it('should not render vendor chip when not provided', () => {
    const workshopNoVendor = { ...mockWorkshop, vendor: undefined };
    render(<WorkshopCard {...defaultProps} workshop={workshopNoVendor} />);
    
    expect(screen.queryByText('Test Vendor')).not.toBeInTheDocument();
  });

  it('should not render difficulty chip when not provided', () => {
    const workshopNoDifficulty = { ...mockWorkshop, difficulty: undefined };
    render(<WorkshopCard {...defaultProps} workshop={workshopNoDifficulty} />);
    
    expect(screen.queryByText('Beginner')).not.toBeInTheDocument();
  });

  it('should not render tags section when empty', () => {
    const workshopNoTags = { ...mockWorkshop, tags: [] };
    render(<WorkshopCard {...defaultProps} workshop={workshopNoTags} />);
    
    expect(screen.queryByText('kubernetes')).not.toBeInTheDocument();
    expect(screen.queryByText('docker')).not.toBeInTheDocument();
  });

  describe('with permissions enabled', () => {
    it('should enable button when permission allowed', () => {
      const { usePermission } = require('@backstage/plugin-permission-react');
      usePermission.mockReturnValue({ allowed: true, loading: false });
      
      render(<WorkshopCard {...defaultProps} enablePermissions />);
      
      const button = screen.getByRole('button', { name: /start workshop/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable button when permission denied', () => {
      const { usePermission } = require('@backstage/plugin-permission-react');
      usePermission.mockReturnValue({ allowed: false, loading: false });
      
      render(<WorkshopCard {...defaultProps} enablePermissions />);
      
      const button = screen.getByRole('button', { name: /start workshop/i });
      expect(button).toBeDisabled();
    });

    it('should show loading state when checking permissions', () => {
      const { usePermission } = require('@backstage/plugin-permission-react');
      usePermission.mockReturnValue({ allowed: false, loading: true });
      
      render(<WorkshopCard {...defaultProps} enablePermissions />);
      
      // Should not show the start button when loading
      expect(screen.queryByRole('button', { name: /start workshop/i })).not.toBeInTheDocument();
    });
  });
});

