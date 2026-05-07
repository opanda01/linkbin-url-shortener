import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShortenResult } from '../features/shorten/ShortenResult.jsx'

const mockData = {
  code: 'abc123',
  url: 'https://example.com',
  shortPath: '/abc123',
  createdAt: new Date().toISOString()
}

describe('ShortenResult', () => {
  it('kısa URL linkini render eder', () => {
    render(<ShortenResult data={mockData} onReset={vi.fn()} />)
    expect(screen.getByRole('link', { name: /abc123/i })).toBeInTheDocument()
  })

  it('istatistik linkini render eder', () => {
    render(<ShortenResult data={mockData} onReset={vi.fn()} />)
    expect(screen.getByRole('link', { name: /istatistik/i })).toBeInTheDocument()
  })

  it('"Yeni kısalt" butonuna tıklayınca onReset çağrılır', () => {
    const onReset = vi.fn()
    render(<ShortenResult data={mockData} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /yeni kısalt/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('Kopyala butonuna tıklayınca clipboard.writeText çağrılır', async () => {
    // navigator.clipboard mock
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ShortenResult data={mockData} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /kopyala/i }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('abc123'))
    })
  })

  it('kopyalandıktan sonra buton metni değişir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ShortenResult data={mockData} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /kopyala/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /kopyalandı/i })).toBeInTheDocument()
    })
  })
})
