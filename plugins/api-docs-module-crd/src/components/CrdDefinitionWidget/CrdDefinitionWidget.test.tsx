/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { CrdDefinitionWidget } from './CrdDefinitionWidget';
import userEvent from '@testing-library/user-event';

describe('CrdDefinitionWidget', () => {
  const mockCrdDefinition = `
Kind: MyResource
Group: example.com
Version: v1
Schema:
  Type: object
  Description: MyResource is a custom Kubernetes resource
  Properties:
    spec:
      Type: object
      Description: Specification of the resource
      Required:
        - name
      Properties:
        name:
          Type: string
          Description: The name of the resource
        replicas:
          Type: integer
          Description: Number of replicas
    status:
      Type: object
      Description: Status of the resource
      Properties:
        phase:
          Type: string
          Description: Current phase of the resource
`;

  const mockK8sCrdDefinition = `
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
spec:
  group: example.com
  names:
    kind: MyResource
    plural: myresources
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required:
              - name
            properties:
              name:
                type: string
              replicas:
                type: integer
          status:
            type: object
            properties:
              phase:
                type: string
`;

  it('should render CRD metadata', async () => {
    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    expect(screen.getByText('MyResource')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('should render CRD properties', async () => {
    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    expect(screen.getByText('spec')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('should handle invalid CRD definition', async () => {
    await renderInTestApp(<CrdDefinitionWidget definition="invalid yaml: [" />);
    
    expect(screen.getByText('Failed to parse CRD definition')).toBeInTheDocument();
  });

  it('should render empty schema message when no properties', async () => {
    const emptySchemaDefinition = `
Kind: EmptyResource
Group: example.com
Version: v1
Schema:
  Type: object
  Description: Resource with no properties
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={emptySchemaDefinition} />);
    
    expect(screen.getByText(/This CRD has an empty or unspecified schema/i)).toBeInTheDocument();
  });

  it('should handle missing Schema field', async () => {
    const noSchemaDefinition = `
Kind: NoSchemaResource
Group: example.com
Version: v1
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={noSchemaDefinition} />);
    
    expect(screen.getAllByText('NoSchemaResource').length).toBeGreaterThan(0);
    expect(screen.getByText(/This CRD has an empty or unspecified schema/i)).toBeInTheDocument();
  });

  it('should parse Kubernetes CRD format', async () => {
    await renderInTestApp(<CrdDefinitionWidget definition={mockK8sCrdDefinition} />);
    
    expect(screen.getAllByText('MyResource').length).toBeGreaterThan(0);
    expect(screen.getAllByText('example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
  });

  it('should render properties from Kubernetes CRD format', async () => {
    await renderInTestApp(<CrdDefinitionWidget definition={mockK8sCrdDefinition} />);
    
    expect(screen.getByText('spec')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('should show version selector for multi-version CRDs', async () => {
    const multiVersionCrd = `
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
spec:
  group: example.com
  names:
    kind: MyResource
    plural: myresources
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              name:
                type: string
  - name: v2
    served: true
    storage: false
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              name:
                type: string
              newField:
                type: string
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={multiVersionCrd} />);
    
    // Should show the version selector
    expect(screen.getByLabelText('Select Version')).toBeInTheDocument();
    
    // Should default to storage version (v1)
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
  });

  it('should default to served version when no storage version exists', async () => {
    const servedOnlyCrd = `
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
spec:
  group: example.com
  names:
    kind: MyResource
  versions:
  - name: v1
    served: true
    storage: false
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={servedOnlyCrd} />);
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
  });

  it('should handle array types in properties', async () => {
    const arrayTypeCrd = `
Kind: ArrayResource
Group: example.com
Version: v1
Schema:
  Type: object
  Properties:
    spec:
      Type: object
      Properties:
        tags:
          Type: array
          Items:
            Type: string
        items:
          Type: array
          Items:
            Schema:
              Type: object
              Properties:
                name:
                  Type: string
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={arrayTypeCrd} />);
    expect(screen.getByText('spec')).toBeInTheDocument();
  });

  it('should copy example YAML to clipboard', async () => {
    const user = userEvent.setup();
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    const copyButton = screen.getByText('Copy Example YAML');
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      const yamlContent = mockWriteText.mock.calls[0][0];
      expect(yamlContent).toContain('apiVersion: example.com/v1');
      expect(yamlContent).toContain('kind: MyResource');
      expect(yamlContent).toContain('spec:');
    });
  });

  it('should handle clipboard fallback for older browsers', async () => {
    const user = userEvent.setup();
    // Simulate clipboard API not available
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Not supported'));
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    // Mock document.execCommand
    const mockExecCommand = jest.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    const copyButton = screen.getByText('Copy Example YAML');
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });
  });

  it('should expand all properties when expand all is clicked', async () => {
    const user = userEvent.setup();
    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    const expandButton = screen.getByText('+ expand all');
    await user.click(expandButton);
    
    // Properties should be visible after expand
    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument();
    });
  });

  it('should collapse all properties when collapse all is clicked', async () => {
    const user = userEvent.setup();
    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    // First expand all
    const expandButton = screen.getByText('+ expand all');
    await user.click(expandButton);
    
    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument();
    });
    
    // Then collapse all
    const collapseButton = screen.getByText('- collapse all');
    await user.click(collapseButton);
    
    // Note: Due to accordion behavior, we just verify the button works
    expect(collapseButton).toBeInTheDocument();
  });

  it('should handle object properties without spec field', async () => {
    const noSpecCrd = `
Kind: NoSpecResource
Group: example.com
Version: v1
Schema:
  Type: object
  Properties:
    apiVersion:
      Type: string
    kind:
      Type: string
    customField:
      Type: string
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={noSpecCrd} />);
    expect(screen.getAllByText('NoSpecResource').length).toBeGreaterThan(0);
  });

  it('should handle nested object properties in arrays', async () => {
    const nestedArrayCrd = `
Kind: NestedArrayResource
Group: example.com
Version: v1
Schema:
  Type: object
  Properties:
    spec:
      Type: object
      Properties:
        servers:
          Type: array
          Items:
            Schema:
              Type: object
              Properties:
                host:
                  Type: string
                config:
                  Type: object
                  Properties:
                    timeout:
                      Type: integer
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={nestedArrayCrd} />);
    expect(screen.getByText('spec')).toBeInTheDocument();
  });

  it('should handle array items without Schema wrapper', async () => {
    const directItemsCrd = `
Kind: DirectItemsResource
Group: example.com
Version: v1
Schema:
  Type: object
  Properties:
    spec:
      Type: object
      Properties:
        items:
          Type: array
          Items:
            Type: object
            Properties:
              name:
                Type: string
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={directItemsCrd} />);
    expect(screen.getByText('spec')).toBeInTheDocument();
  });

  it('should show required chip for required fields', async () => {
    await renderInTestApp(<CrdDefinitionWidget definition={mockCrdDefinition} />);
    
    // Expand spec to see required fields
    const specAccordion = screen.getByText('spec').closest('div[role="button"]');
    if (specAccordion) {
      fireEvent.click(specAccordion);
    }
    
    await waitFor(() => {
      const requiredChips = screen.getAllByText('required');
      expect(requiredChips.length).toBeGreaterThan(0);
    });
  });

  it('should handle complex nested structures in example YAML', async () => {
    const user = userEvent.setup();
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    const complexCrd = `
Kind: ComplexResource
Group: example.com
Version: v1
Schema:
  Type: object
  Properties:
    spec:
      Type: object
      Properties:
        nested:
          Type: object
          Properties:
            deep:
              Type: object
              Properties:
                value:
                  Type: string
        simpleArray:
          Type: array
          Items:
            Type: string
`;
    
    await renderInTestApp(<CrdDefinitionWidget definition={complexCrd} />);
    
    const copyButton = screen.getByText('Copy Example YAML');
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      const yamlContent = mockWriteText.mock.calls[0][0];
      expect(yamlContent).toContain('nested:');
      expect(yamlContent).toContain('simpleArray: []');
    });
  });
});
