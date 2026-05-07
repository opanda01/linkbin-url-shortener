export function formatDate(isoString) {
  if (!isoString) return '—'
  // Redis'ten YYYY-MM-DD formatında da gelebilir
  const date = isoString.includes('T') ? new Date(isoString) : new Date(isoString + 'T00:00:00')
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatNumber(n) {
  return new Intl.NumberFormat('tr-TR').format(n)
}
