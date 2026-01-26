import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { DevpodProvider, useDevpodConfig } from './DevpodProvider';
import { DevpodIDE } from '../../types';

const mockConfigApi = {
  getOptionalString: jest.fn(),
};

const TestConsumer = () => {
  const config = useDevpodConfig();
  return <div data-testid="config">{JSON.stringify(config)}</div>;
};

describe('DevpodProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigApi.getOptionalString.mockReturnValue(undefined);
  });

  it('should provide default config when no config specified', () => {
    render(
      <TestApiProvider apis={[[configApiRef, mockConfigApi]]}>
        <DevpodProvider>
          <TestConsumer />
        </DevpodProvider>
      </TestApiProvider>
    );

    const configDiv = screen.getByTestId('config');
    expect(configDiv.textContent).toContain('vscode');
  });

  it('should use config from configApi when available', () => {
    mockConfigApi.getOptionalString.mockReturnValue(DevpodIDE.CURSOR);

    render(
      <TestApiProvider apis={[[configApiRef, mockConfigApi]]}>
        <DevpodProvider>
          <TestConsumer />
        </DevpodProvider>
      </TestApiProvider>
    );

    const configDiv = screen.getByTestId('config');
    expect(configDiv.textContent).toContain('cursor');
  });

  it('should render children', () => {
    render(
      <TestApiProvider apis={[[configApiRef, mockConfigApi]]}>
        <DevpodProvider>
          <div data-testid="child">Child content</div>
        </DevpodProvider>
      </TestApiProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('useDevpodConfig', () => {
  it('should return default IDE when not configured', () => {
    render(
      <TestApiProvider apis={[[configApiRef, mockConfigApi]]}>
        <DevpodProvider>
          <TestConsumer />
        </DevpodProvider>
      </TestApiProvider>
    );

    const configDiv = screen.getByTestId('config');
    const config = JSON.parse(configDiv.textContent || '{}');
    expect(config.defaultIde).toBe(DevpodIDE.VSCODE);
  });
});
