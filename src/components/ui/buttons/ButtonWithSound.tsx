'use client'

import React, { ButtonHTMLAttributes, ElementType, ComponentPropsWithRef } from 'react'
import useButtonSound from '@/hooks/useButtonSound'

type ButtonWithSoundProps<C extends ElementType = 'button'> = {
  as?: C
  children: React.ReactNode
} & ComponentPropsWithRef<C>

export const ButtonWithSound = <C extends ElementType = 'button'>({ 
  as,
  children, 
  onClick,
  ...props 
}: ButtonWithSoundProps<C>) => {
  const Component = as || 'button'
  const playSound = useButtonSound()
  
  const handleClick = (e: React.MouseEvent) => {
    // Play sound effect
    playSound()
    
    // Call the original onClick handler if provided
    if (onClick) {
      onClick(e as any)
    }
  }
  
  return (
    <Component 
      onClick={handleClick} 
      {...props}
    >
      {children}
    </Component>
  )
}

export default ButtonWithSound