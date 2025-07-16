# Therapy Insights Components

This directory contains specialized error handling components for therapy insights features.

## TherapyInsightsErrorBoundary

A specialized error boundary designed specifically for therapy insights components that:
- Provides user-friendly error messages
- Automatically retries for transient errors (network, timeouts)
- Shows partial data when available
- Logs errors to monitoring services
- Gracefully degrades functionality

### Usage

```tsx
import { TherapyInsightsErrorBoundary } from '@/components/therapy-insights'

// Basic usage
<TherapyInsightsErrorBoundary>
  <ComprehensiveTherapyInsights />
</TherapyInsightsErrorBoundary>

// With partial data fallback
<TherapyInsightsErrorBoundary 
  showPartialData={true}
  partialData={cachedInsights}
>
  <ComprehensiveTherapyInsights />
</TherapyInsightsErrorBoundary>

// With error callback
<TherapyInsightsErrorBoundary 
  onError={(error, errorInfo) => {
    // Custom error handling
    logToAnalytics('therapy_insights_error', { error })
  }}
>
  <ComprehensiveTherapyInsights />
</TherapyInsightsErrorBoundary>
```

### HOC Usage

```tsx
import { withTherapyInsightsErrorBoundary } from '@/components/therapy-insights'

const SafeInsights = withTherapyInsightsErrorBoundary(ComprehensiveTherapyInsights, {
  showPartialData: true,
  partialData: fallbackData,
})

// Use in component
<SafeInsights />
```

### Features

- **Auto-retry**: Automatically retries transient errors (network, 5xx errors) up to 2 times
- **Partial data**: Can display cached or partial data while showing error state
- **User-friendly UI**: Shows appropriate icons and messages based on error type
- **Development mode**: Shows detailed error stack in development
- **Production logging**: Sends errors to Sentry in production

### Error Types Handled

1. **Network Errors**: Connection failures, timeouts
2. **API Errors**: 500-series errors from backend
3. **Component Errors**: React rendering errors
4. **Data Loading Errors**: Failed data fetches

### Styling

The component uses Tailwind classes and follows the app's design system:
- Glass morphism effects with backdrop blur
- Consistent color scheme (gray-800/50 backgrounds)
- Smooth animations with Framer Motion
- Responsive design for mobile and desktop