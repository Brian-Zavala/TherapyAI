import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
}

const badgeVariants = {
  default: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
  secondary: 'bg-gray-700/20 text-gray-400 border-gray-600/20',
  destructive: 'bg-red-600/20 text-red-400 border-red-500/20',
  outline: 'text-gray-400 border-gray-600',
  success: 'bg-green-600/20 text-green-400 border-green-500/20',
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'