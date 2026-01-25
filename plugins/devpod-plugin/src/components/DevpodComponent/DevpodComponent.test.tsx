import React from 'react';
import { render, screen } from '@testing-library/react';
import { DevpodComponent, isDevpodAvailable } from './DevpodComponent';
import { useDevpod } from '../../hooks/useDevpod';

jest.mock('../../hooks/useDevpod');

const mockUseDevpod = useDevpod as jest.MockedFunction<typeof useDevpod>;

describe('DevpodComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isDevpodAvailable', () => {
    it('should return true when source-location starts with url:', () => {
      const entity = {
        metadata: {
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/org/repo',
          },
        },
      } as any;

      expect(isDevpodAvailable(entity)).toBe(true);
    });

    it('should return false when source-location does not start with url:', () => {
      const entity = {
        metadata: {
          annotations: {
            'backstage.io/source-location': 'file:/path/to/repo',
          },
        },
      } as any;

      expect(isDevpodAvailable(entity)).toBe(false);
    });

    it('should return false when no source-location annotation', () => {
      const entity = {
        metadata: {
          annotations: {},
        },
      } as any;

      expect(isDevpodAvailable(entity)).toBe(false);
    });

    it('should return false when no annotations', () => {
      const entity = {
        metadata: {},
      } as any;

      expect(isDevpodAvailable(entity)).toBe(false);
    });
  });

  describe('component rendering', () => {
    it('should render message when no git URL', () => {
      mockUseDevpod.mockReturnValue({
        hasGitUrl: false,
        devpodUrl: '',
        selectedIde: 'vscode' as any,
        setSelectedIde: jest.fn(),
        componentName: 'test-component',
      });

      render(<DevpodComponent />);

      expect(screen.getByText('No Git source URL found for this component')).toBeInTheDocument();
    });

    it('should render devpod button when git URL is available', () => {
      mockUseDevpod.mockReturnValue({
        hasGitUrl: true,
        devpodUrl: 'devpod://open#https%3A%2F%2Fgithub.com%2Forg%2Frepo',
        selectedIde: 'vscode' as any,
        setSelectedIde: jest.fn(),
        componentName: 'test-component',
      });

      render(<DevpodComponent />);

      expect(screen.getByText('Open With DevPod')).toBeInTheDocument();
      expect(screen.getByText('Your component can be opened in Devpod!')).toBeInTheDocument();
    });

    it('should render IDE selector when git URL is available', () => {
      mockUseDevpod.mockReturnValue({
        hasGitUrl: true,
        devpodUrl: 'devpod://open#https%3A%2F%2Fgithub.com%2Forg%2Frepo',
        selectedIde: 'vscode' as any,
        setSelectedIde: jest.fn(),
        componentName: 'test-component',
      });

      render(<DevpodComponent />);

      expect(screen.getByRole('button', { name: /vscode/i })).toBeInTheDocument();
    });
  });
});
