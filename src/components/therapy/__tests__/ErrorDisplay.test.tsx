import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { ErrorDisplay } from '../ErrorDisplay'

describe('ErrorDisplay', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(
      <ErrorDisplay error={null} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('renders error message when error is provided', () => {
    const errorMessage = 'Connection failed. Please try again.'
    const { getByText } = render(
      <ErrorDisplay error={errorMessage} />
    )
    
    expect(getByText(errorMessage)).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    const mockOnDismiss = jest.fn()
    const { getByLabelText } = render(
      <ErrorDisplay 
        error="Test error" 
        onDismiss={mockOnDismiss} 
      />
    )
    
    fireEvent.click(getByLabelText('Dismiss'))
    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not show dismiss button when onDismiss is not provided', () => {
    const { queryByLabelText } = render(
      <ErrorDisplay error="Test error" />
    )
    
    expect(queryByLabelText('Dismiss')).not.toBeInTheDocument()
  })

  it('animates in and out correctly', async () => {
    const { rerender, container, queryByText } = render(
      <ErrorDisplay error={null} />
    )
    
    // Should not be visible initially
    expect(container.firstChild).toBeNull()
    
    // Show error
    rerender(<ErrorDisplay error="Animation test error" />)
    
    // Should be visible
    await waitFor(() => {
      expect(queryByText('Animation test error')).toBeInTheDocument()
    })
    
    // Hide error
    rerender(<ErrorDisplay error={null} />)
    
    // Should animate out
    await waitFor(() => {
      expect(queryByText('Animation test error')).not.toBeInTheDocument()
    })
  })
})