import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCard } from '../features/stats/StatsCard.jsx'

const baseData = {
  code: 'test01',
  url: 'https://example.com/long-url',
  createdAt: '2026-05-01T10:00:00.000Z',
  clicks: 42,
  ttlDays: 25,
  lastClickAt: '2026-05-07',
  series: { labels: ['2026-05-07'], data: [42] }
}

describe('StatsCard', () => {
  it('toplam tıklama sayısını gösterir', () => {
    render(<StatsCard data={baseData} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('kısa URL linkini render eder', () => {
    render(<StatsCard data={baseData} />)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.textContent.includes('test01'))).toBe(true)
  })

  it('hedef URL linkini render eder', () => {
    render(<StatsCard data={baseData} />)
    expect(screen.getByRole('link', { name: /example\.com\/long-url/i })).toBeInTheDocument()
  })

  it('ttlDays null ise son kullanma satırı render edilmez', () => {
    render(<StatsCard data={{ ...baseData, ttlDays: null }} />)
    expect(screen.queryByText(/son kullanma/i)).not.toBeInTheDocument()
  })

  it('ttlDays varsa kalan gün gösterilir', () => {
    render(<StatsCard data={baseData} />)
    expect(screen.getByText('25 gün')).toBeInTheDocument()
  })

  it('lastClickAt null ise son tıklama satırı render edilmez', () => {
    render(<StatsCard data={{ ...baseData, lastClickAt: null }} />)
    expect(screen.queryByText(/son tıklama/i)).not.toBeInTheDocument()
  })

  it('oluşturulma tarihi render edilir', () => {
    render(<StatsCard data={baseData} />)
    expect(screen.getByText(/oluşturulma/i)).toBeInTheDocument()
  })
})
