/**
 * Unified Empty State Theme for Dashboard
 * 
 * Design Philosophy:
 * - Consistent, calming color palette across all empty states
 * - Subtle gradients that complement the dark background
 * - Clear visual hierarchy with proper contrast
 * - Interactive elements with clear affordances
 */

export const emptyStateTheme = {
  // Unified color palette - soft, inviting tones
  colors: {
    // Primary empty state colors - muted purples for therapy/wellness theme
    primary: {
      background: 'from-purple-500/10 to-pink-500/10 dark:from-purple-500/5 dark:to-pink-500/5',
      icon: 'text-purple-500 dark:text-purple-400',
      iconBackground: 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
      button: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      buttonText: 'text-white',
    },
    // Consistent text colors
    text: {
      title: 'text-gray-900 dark:text-gray-100',
      description: 'text-gray-600 dark:text-gray-400',
    },
    // Icon container styling
    iconContainer: {
      size: 'w-20 h-20',
      borderRadius: 'rounded-full',
      animation: 'transition-transform duration-300 hover:scale-110',
    },
  },
  
  // Consistent spacing
  spacing: {
    container: 'py-12 sm:py-16',
    iconMargin: 'mb-6',
    titleMargin: 'mb-3',
    descriptionMargin: 'mb-8',
  },
  
  // Typography
  typography: {
    title: 'text-lg sm:text-xl font-semibold',
    description: 'text-sm sm:text-base max-w-md mx-auto leading-relaxed',
  },
  
  // Button styling
  button: {
    base: 'gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer',
    hover: 'hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105',
    focus: 'focus:outline-none focus:ring-4 focus:ring-purple-500/20',
  },
  
  // Animations
  animations: {
    container: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    icon: {
      hover: { rotate: [0, -5, 5, 0] },
      transition: { duration: 0.5 },
    },
  },
};

// Helper function to get consistent empty state classes
export function getEmptyStateClasses() {
  return {
    container: `text-center ${emptyStateTheme.spacing.container}`,
    iconWrapper: `mx-auto ${emptyStateTheme.colors.iconContainer.size} ${emptyStateTheme.colors.iconContainer.borderRadius} ${emptyStateTheme.colors.iconContainer.animation} ${emptyStateTheme.colors.primary.iconBackground} flex items-center justify-center ${emptyStateTheme.spacing.iconMargin} cursor-pointer`,
    icon: `h-10 w-10 ${emptyStateTheme.colors.primary.icon}`,
    title: `${emptyStateTheme.typography.title} ${emptyStateTheme.colors.text.title} ${emptyStateTheme.spacing.titleMargin}`,
    description: `${emptyStateTheme.typography.description} ${emptyStateTheme.colors.text.description}`,
    button: `${emptyStateTheme.button.base} ${emptyStateTheme.colors.primary.button} ${emptyStateTheme.colors.primary.buttonText} ${emptyStateTheme.button.hover} ${emptyStateTheme.button.focus}`,
  };
}