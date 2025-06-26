import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  as?: 'button'
}

const buttonVariants = {
  default: 'bg-purple-600 text-white hover:bg-purple-700',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  outline: 'border border-gray-600 bg-transparent hover:bg-gray-800 text-white',
  secondary: 'bg-gray-800 text-white hover:bg-gray-700',
  ghost: 'hover:bg-gray-800 hover:text-white',
  link: 'text-purple-400 underline-offset-4 hover:underline',
}

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', as = 'button', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'