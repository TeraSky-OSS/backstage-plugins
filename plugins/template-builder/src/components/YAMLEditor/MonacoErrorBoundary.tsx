import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MonacoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // Check if this is a Monaco hit test error
    const errorStr = String(error?.message || '');
    const stackStr = String(error?.stack || '');
    
    if (errorStr.includes('offsetNode') || 
        errorStr.includes('doHitTest') ||
        stackStr.includes('_doHitTestWithCaretPositionFromPoint') ||
        stackStr.includes('monaco-editor')) {
      // Suppress Monaco hit test errors - don't update state
      return null; // Don't update state, continue rendering
    }
    
    // For other errors, show error state
    return { hasError: true };
  }

  componentDidCatch(error: any, _errorInfo: any) {
    const errorStr = String(error?.message || '');
    const stackStr = String(error?.stack || '');
    
    // Suppress Monaco hit test errors
    if (errorStr.includes('offsetNode') || 
        errorStr.includes('doHitTest') ||
        stackStr.includes('_doHitTestWithCaretPositionFromPoint')) {
      return;
    }
    
    // Error logged internally
  }

  render() {
    if (this.state.hasError) {
      return <div>Editor encountered an error. Please refresh the page.</div>;
    }

    return this.props.children;
  }
}
