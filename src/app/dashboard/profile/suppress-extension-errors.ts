/**
 * Suppress browser extension errors that are outside our control
 * These errors don't affect app functionality but clutter the console
 */
export function suppressExtensionErrors() {
  if (typeof window !== 'undefined') {
    const originalError = window.console.error;
    window.console.error = function(...args) {
      // Filter out known extension errors
      const errorMessage = args[0]?.toString() || '';
      
      const extensionErrors = [
        'A listener indicated an asynchronous response by returning true',
        'message channel closed',
        'Extension context invalidated',
        'Cannot access a chrome:// URL',
        'unchecked runtime.lastError'
      ];
      
      const isExtensionError = extensionErrors.some(err => 
        errorMessage.includes(err)
      );
      
      if (!isExtensionError) {
        originalError.apply(console, args);
      }
    };
  }
}