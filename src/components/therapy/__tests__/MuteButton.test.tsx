import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { MuteButton } from '../MuteButton'

describe('MuteButton', () => {
  it('renders unmuted state correctly', () => {
    const { getByLabelText, getByText } = render(
      <MuteButton isMuted={false} onClick={jest.fn()} />
    )
    
    expect(getByLabelText('Mute microphone')).toBeInTheDocument()
    expect(getByText('Mute')).toBeInTheDocument()
  })

  it('renders muted state correctly', () => {
    const { getByLabelText, getByText } = render(
      <MuteButton isMuted={true} onClick={jest.fn()} />
    )
    
    expect(getByLabelText('Unmute microphone')).toBeInTheDocument()
    expect(getByText('Unmute')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn()
    const { getByRole } = render(
      <MuteButton isMuted={false} onClick={mockOnClick} />
    )
    
    fireEvent.click(getByRole('button'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('disables button when disabled prop is true', () => {
    const { getByRole } = render(
      <MuteButton isMuted={false} onClick={jest.fn()} disabled={true} />
    )
    
    expect(getByRole('button')).toBeDisabled()
  })
})