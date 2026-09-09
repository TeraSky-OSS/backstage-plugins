import { Button } from '@backstage/ui';
import { RiDownloadLine } from '@remixicon/react';

export interface DownloadButtonProps {
  templateName: string;
  yamlContent: string;
  onDownload?: () => void;
}

export function DownloadButton(props: DownloadButtonProps) {
  const { templateName, yamlContent, onDownload } = props;

  const handleDownload = () => {
    const blob = new Blob([yamlContent], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateName || 'template'}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onDownload) {
      onDownload();
    }
  };

  return (
    <Button variant="primary" iconStart={<RiDownloadLine />} onPress={handleDownload}>
      Download
    </Button>
  );
}
