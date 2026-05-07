import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShortenForm } from '../features/shorten/ShortenForm.jsx'

describe('ShortenForm', () => {
  it('URL ve alias inputlarını render eder', () => {
    render(<ShortenForm onSubmit={vi.fn()} loading={false} />)
    expect(screen.getByPlaceholderText(/https:\/\/ornek\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/ornek-isim/i)).toBeInTheDocument()
  })

  it('submit butonunu render eder', () => {
    render(<ShortenForm onSubmit={vi.fn()} loading={false} />)
    expect(screen.getByRole('button', { name: /kısalt/i })).toBeInTheDocument()
  })

  it('loading=true iken buton disabled olur', () => {
    render(<ShortenForm onSubmit={vi.fn()} loading={true} />)
    expect(screen.getByRole('button', { name: /kısalt/i })).toBeDisabled()
  })

  it('URL girilmeden submit edildiğinde onSubmit çağrılmaz', () => {
    const onSubmit = vi.fn()
    render(<ShortenForm onSubmit={onSubmit} loading={false} />)
    fireEvent.submit(screen.getByRole('button', { name: /kısalt/i }).closest('form'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('URL girilince onSubmit doğru argümanlarla çağrılır', () => {
    const onSubmit = vi.fn()
    render(<ShortenForm onSubmit={onSubmit} loading={false} />)

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/ornek\.com/i), {
      target: { value: 'https://example.com' }
    })
    fireEvent.change(screen.getByPlaceholderText(/ornek-isim/i), {
      target: { value: 'my-alias' }
    })
    fireEvent.submit(screen.getByRole('button').closest('form'))

    expect(onSubmit).toHaveBeenCalledWith({ url: 'https://example.com', alias: 'my-alias' })
  })

  it('alias boşsa onSubmit boş string ile çağrılır', () => {
    const onSubmit = vi.fn()
    render(<ShortenForm onSubmit={onSubmit} loading={false} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/ornek\.com/i), {
      target: { value: 'https://example.com' }
    })
    fireEvent.submit(screen.getByRole('button').closest('form'))
    expect(onSubmit).toHaveBeenCalledWith({ url: 'https://example.com', alias: '' })
  })
})
