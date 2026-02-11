// Install global Monaco error suppression as early as possible
if (typeof window !== 'undefined') {
  // Suppress Monaco hit test errors globally
  const originalWindowError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorStr = String(message || error?.message || '');
    
    if (errorStr.includes('offsetNode') || 
        errorStr.includes('doHitTest') ||
        errorStr.includes('_doHitTestWithCaretPositionFromPoint') ||
        (source && String(source).includes('monaco-editor'))) {
      return true; // Suppress error
    }
    
    if (originalWindowError) {
      return originalWindowError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress via console to prevent React error overlay
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = args.join(' ');
    
    if (errorStr.includes('offsetNode') || 
        errorStr.includes('doHitTest') ||
        errorStr.includes('_doHitTestWithCaretPositionFromPoint') ||
        errorStr.includes('monaco-editor')) {
      return; // Suppress completely
    }
    
    originalConsoleError.apply(console, args);
  };

  // Suppress via addEventListener for error events (capture phase)
  window.addEventListener('error', (event) => {
    const errorStr = String(event.message || event.error?.message || '');
    const stackStr = String(event.error?.stack || '');
    
    if (errorStr.includes('offsetNode') || 
        errorStr.includes('doHitTest') ||
        stackStr.includes('_doHitTestWithCaretPositionFromPoint') ||
        (event.filename && event.filename.includes('monaco-editor'))) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true); // Use capture phase to intercept before React
}

export { templateBuilderPlugin as default } from './plugin';
export { templateBuilderApiRef } from './api';
export { TemplateBuilderPage } from './components/TemplateBuilderPage';
export { TemplateEditorCard } from './components/TemplateEditorCard';
