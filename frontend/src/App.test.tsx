import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the example page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Example API' })).toBeInTheDocument()
  })
})
