import { render } from '@testing-library/react';
import { SpringInitializerForm } from './SpringInitializerForm';
import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef, fetchApiRef, discoveryApiRef } from '@backstage/core-plugin-api';

describe('SpringInitializerForm', () => {
  it('should render without crashing', () => {
    const mockFetchApi = {
      fetch: jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          type: { default: 'maven-project', values: [] },
          language: { default: 'java', values: [] },
          bootVersion: { default: '3.5.10', values: [] },
          groupId: { default: 'com.example' },
          artifactId: { default: 'demo' },
          version: { default: '0.0.1-SNAPSHOT' },
          name: { default: 'demo' },
          description: { default: 'Demo' },
          packageName: { default: 'com.example.demo' },
          packaging: { default: 'jar', values: [] },
          javaVersion: { default: '17', values: [] },
          dependencies: { values: [] },
        }),
      }),
    };

    const mockConfigApi = {
      getOptionalString: jest.fn().mockReturnValue('https://start.spring.io'),
      getOptionalBoolean: jest.fn().mockReturnValue(false),
      getOptionalStringArray: jest.fn().mockReturnValue([]),
    };

    const mockDiscoveryApi = {
      getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/proxy'),
    };

    const mockFormContext = {
      formData: {},
    };

    const mockProps = {
      onChange: jest.fn(),
      onBlur: jest.fn(),
      onFocus: jest.fn(),
      formContext: mockFormContext,
      rawErrors: [],
      required: false,
      disabled: false,
      readonly: false,
      name: 'springConfig',
      schema: {},
      uiSchema: {},
      idSchema: { $id: 'test' } as any,
      formData: {},
      errorSchema: {},
      registry: {} as any,
    };

    const { container } = render(
      <TestApiProvider
        apis={[
          [fetchApiRef, mockFetchApi],
          [configApiRef, mockConfigApi],
          [discoveryApiRef, mockDiscoveryApi],
        ]}
      >
        <SpringInitializerForm {...mockProps} />
      </TestApiProvider>,
    );

    expect(container).toBeDefined();
  });
});
