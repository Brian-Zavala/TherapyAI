import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { PauseResumeButton } from '../PauseResumeButton'

describe('PauseResumeButton', () => {
  it('renders pause state correctly', () => {
    const { getByLabelText, getByText } = render(
      <PauseResumeButton isPaused={false} onClick={jest.fn()} />
    )
    
    expect(getByLabelText('Pause session')).toBeInTheDocument()
    expect(getByText('Pause')).toBeInTheDocument()
  })

  it('renders resume state correctly', () => {
    const { getByLabelText, getByText } = render(
      <PauseResumeButton isPaused={true} onClick={jest.fn()} />
    )
    
    expect(getByLabelText('Resume session')).toBeInTheDocument()
    expect(getByText('Resume')).toBeInTheDocument()
  })

  it('shows saved time when paused', () => {
    const { getByText } = render(
      <PauseResumeButton 
        isPaused={true} 
        onClick={jest.fn()} 
        totalPausedTimeSeconds={300} // 5 minutes
      />
    )
    
    expect(getByText('💰 5m saved')).toBeInTheDocument()
  })

  it('does not show saved time when not paused', () => {
    const { queryByText } = render(
      <PauseResumeButton 
        isPaused={false} 
        onClick={jest.fn()} 
        totalPausedTimeSeconds={300}
      />
    )
    
    expect(queryByText('💰 5m saved')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn()
    const { getByRole } = render(
      <PauseResumeButton isPaused={false} onClick={mockOnClick} />
    )
    
    fireEvent.click(getByRole('button'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })
})