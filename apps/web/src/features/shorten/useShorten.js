import { useState } from 'react'
import { apiClient } from '../../shared/api/client.js'

export function useShorten() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function shorten({ url, alias }) {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.post('/api/shorten', { url, alias: alias || undefined })
      setData(res.data)
    } catch (err) {
      const status = err.response?.status
      const retryAfter = err.response?.data?.retryAfterSec

      if (status === 429) {
        const mins = retryAfter ? Math.ceil(retryAfter / 60) : null
        setError(mins
          ? `Çok fazla istek gönderildi. ${mins} dakika sonra tekrar deneyin.`
          : 'Çok fazla istek gönderildi. Lütfen bekleyin.'
        )
      } else if (status === 409) {
        setError('Bu kısa kod zaten kullanımda. Farklı bir alias deneyin.')
      } else {
        setError(err.response?.data?.error || 'Beklenmeyen bir hata oluştu')
      }
    }finally {
      setLoading(false)
    }
  }

  function reset() {
    setData(null)
    setError(null)
  }

  return { data, error, loading, shorten, reset }
}
