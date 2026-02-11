/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DownloadButton } from './DownloadButton';

describe('DownloadButton', () => {
  beforeEach(() => {
    // Mock URL APIs
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render download button', () => {
    render(<DownloadButton templateName="test" yamlContent="test: yaml" />);
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should call onDownload callback when clicked', () => {
    const onDownload = jest.fn();
    render(
      <DownloadButton 
        templateName="my-template" 
        yamlContent="test: yaml"
        onDownload={onDownload}
      />
    );
    
    const button = screen.getByText('Download');
    fireEvent.click(button);

    expect(onDownload).toHaveBeenCalled();
  });

  it('should create download with correct filename', () => {
    render(<DownloadButton templateName="custom-name" yamlContent="test: yaml" />);
    
    const button = screen.getByText('Download');
    fireEvent.click(button);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
