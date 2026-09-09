import { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Card, CardBody, Flex, Text } from '@backstage/ui';
import { RiErrorWarningLine } from '@remixicon/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error caught, displaying error UI
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Flex
          align="center"
          justify="center"
          style={{ minHeight: 400, padding: 'var(--bui-space-4)' }}
        >
          <Card style={{ maxWidth: 600 }}>
            <CardBody>
              <Flex direction="column" align="center" style={{ textAlign: 'center' }}>
                <RiErrorWarningLine
                  size={64}
                  color="var(--bui-fg-negative)"
                  style={{ marginBottom: 'var(--bui-space-2)' }}
                />
                <Text as="p" variant="title-small" weight="bold">
                  Something went wrong
                </Text>
                <Text as="p" variant="body-medium" color="secondary" style={{ marginTop: 'var(--bui-space-1)', marginBottom: 'var(--bui-space-2)' }}>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </Text>
                <Button variant="primary" onPress={this.handleReset}>
                  Try Again
                </Button>
              </Flex>
            </CardBody>
          </Card>
        </Flex>
      );
    }

    return this.props.children;
  }
}
