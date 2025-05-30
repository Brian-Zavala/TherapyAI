/**
 * Robust scroll-to-top utility that handles various edge cases and CSS interference
 */

export interface ScrollDebugInfo {
  initialPosition: number;
  finalPosition: number;
  documentHeight: number;
  viewportHeight: number;
  isScrollable: boolean;
  methods: string[];
}

/**
 * Force scroll to top using multiple methods and provide debug information
 */
export function forceScrollToTop(debugLabel?: string): Promise<ScrollDebugInfo> {
  return new Promise((resolve) => {
    const label = debugLabel || 'ScrollToTop';
    const initialPosition = window.scrollY;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    const viewportHeight = window.innerHeight;
    const isScrollable = documentHeight > viewportHeight;
    const methodsUsed: string[] = [];

    console.log(`${label}: Starting scroll-to-top operation`);
    console.log(`${label}: Initial position: ${initialPosition}`);
    console.log(`${label}: Document height: ${documentHeight}, Viewport height: ${viewportHeight}`);
    console.log(`${label}: Is scrollable: ${isScrollable}`);

    // If not scrollable, return immediately
    if (!isScrollable && initialPosition === 0) {
      console.log(`${label}: Page is not scrollable and already at top`);
      resolve({
        initialPosition,
        finalPosition: 0,
        documentHeight,
        viewportHeight,
        isScrollable,
        methods: ['not-needed']
      });
      return;
    }

    // Method 1: Temporarily disable smooth scrolling and use modern API
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
      methodsUsed.push('window.scrollTo-auto');
    } catch (e) {
      console.warn(`${label}: window.scrollTo failed:`, e);
    }

    // Method 2: Direct property manipulation
    try {
      document.documentElement.scrollTop = 0;
      methodsUsed.push('documentElement.scrollTop');
    } catch (e) {
      console.warn(`${label}: documentElement.scrollTop failed:`, e);
    }

    try {
      document.body.scrollTop = 0;
      methodsUsed.push('body.scrollTop');
    } catch (e) {
      console.warn(`${label}: body.scrollTop failed:`, e);
    }

    // Method 3: Legacy window.scroll
    try {
      window.scroll(0, 0);
      methodsUsed.push('window.scroll');
    } catch (e) {
      console.warn(`${label}: window.scroll failed:`, e);
    }

    // Method 4: Try scrollTo with instant behavior
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
      methodsUsed.push('window.scrollTo-instant');
    } catch (e) {
      console.warn(`${label}: window.scrollTo instant failed:`, e);
    }

    // Check result after a frame
    requestAnimationFrame(() => {
      const finalPosition = window.scrollY;
      
      // Restore original scroll behavior
      document.documentElement.style.scrollBehavior = originalScrollBehavior;
      document.body.style.scrollBehavior = originalScrollBehavior;

      console.log(`${label}: Final position: ${finalPosition}`);
      console.log(`${label}: Methods used: ${methodsUsed.join(', ')}`);
      console.log(`${label}: Success: ${finalPosition === 0}`);

      resolve({
        initialPosition,
        finalPosition,
        documentHeight,
        viewportHeight,
        isScrollable,
        methods: methodsUsed
      });
    });
  });
}

/**
 * Check if the current page is scrollable
 */
export function isPageScrollable(): boolean {
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  );
  const viewportHeight = window.innerHeight;
  return documentHeight > viewportHeight;
}

/**
 * Get comprehensive scroll information for debugging
 */
export function getScrollDebugInfo(label?: string): void {
  const debugLabel = label || 'ScrollDebug';
  
  console.group(`${debugLabel}: Scroll Debug Information`);
  console.log('window.scrollY:', window.scrollY);
  console.log('window.pageYOffset:', window.pageYOffset);
  console.log('document.documentElement.scrollTop:', document.documentElement.scrollTop);
  console.log('document.body.scrollTop:', document.body.scrollTop);
  console.log('document.body.scrollHeight:', document.body.scrollHeight);
  console.log('document.body.offsetHeight:', document.body.offsetHeight);
  console.log('document.documentElement.clientHeight:', document.documentElement.clientHeight);
  console.log('document.documentElement.scrollHeight:', document.documentElement.scrollHeight);
  console.log('document.documentElement.offsetHeight:', document.documentElement.offsetHeight);
  console.log('window.innerHeight:', window.innerHeight);
  console.log('window.outerHeight:', window.outerHeight);
  console.log('Is scrollable:', isPageScrollable());
  
  const computedStyle = getComputedStyle(document.documentElement);
  console.log('html scroll-behavior:', computedStyle.scrollBehavior);
  console.log('html overflow:', computedStyle.overflow);
  console.log('html overflow-y:', computedStyle.overflowY);
  
  const bodyStyle = getComputedStyle(document.body);
  console.log('body overflow:', bodyStyle.overflow);
  console.log('body overflow-y:', bodyStyle.overflowY);
  console.log('body height:', bodyStyle.height);
  console.log('body min-height:', bodyStyle.minHeight);
  
  console.groupEnd();
}

/**
 * Enhanced scroll to top with comprehensive logging and fallbacks
 */
export async function enhancedScrollToTop(debugLabel?: string): Promise<boolean> {
  const label = debugLabel || 'EnhancedScrollToTop';
  
  // Get initial debug info
  getScrollDebugInfo(`${label}-Before`);
  
  // Perform the scroll operation
  const result = await forceScrollToTop(label);
  
  // Get final debug info
  getScrollDebugInfo(`${label}-After`);
  
  return result.finalPosition === 0;
}