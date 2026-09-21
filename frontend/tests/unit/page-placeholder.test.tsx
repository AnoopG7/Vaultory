import { render, screen } from '@testing-library/react'
import { Package } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

describe('PagePlaceholder', () => {
  it('renders the supplied title, description, and icon container', () => {
    render(<PagePlaceholder title="Inventory" description="Track stock levels" icon={Package} />)

    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    expect(screen.getByText('Track stock levels')).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeInTheDocument()
  })
})
