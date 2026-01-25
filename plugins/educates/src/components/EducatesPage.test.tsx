import React from 'react';
import { EducatesPage } from './EducatesPage';

// Mock everything to avoid complex async issues
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn((ref: any) => {
    if (ref.id === 'core.config') {
      return {
        getConfigArray: () => [],
        getOptionalBoolean: () => false,
      };
    }
    return {
      getWorkshops: jest.fn(),
      requestWorkshop: jest.fn(),
    };
  }),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: () => ({ allowed: true, loading: false }),
}));

describe('EducatesPage', () => {
  it('should be defined', () => {
    expect(EducatesPage).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof EducatesPage).toBe('function');
  });
});

