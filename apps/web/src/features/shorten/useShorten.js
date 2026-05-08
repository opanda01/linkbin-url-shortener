import { useState } from 'react'
import { API_BASE_URL, API_CONFIG_ERROR, apiClient } from '../../shared/api/client.js'

export function useShorten() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function shorten({ url, alias }) {
    if (API_CONFIG_ERROR) {
      setData(null)
      setError(API_CONFIG_ERROR)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.post('/api/shorten', { url, alias: alias || undefined })
      if (!isShortenResponse(res.data)) {
        throw new Error(`API beklenmeyen cevap döndürdü. VITE_API_URL değerinin API servisini gösterdiğinden emin olun: ${API_BASE_URL}`)
      }
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
      } else if (err.code === 'ECONNABORTED') {
        setError(`API yanıt vermedi (${API_BASE_URL}). Render API servisinin çalıştığını kontrol edin.`)
      } else if (err.request && !err.response) {
        setError(`API’ye ulaşılamadı (${API_BASE_URL}). Render'da VITE_API_URL değerinin doğru olduğundan emin olun.`)
      } else {
        setError(err.response?.data?.error || err.message || 'Beklenmeyen bir hata oluştu')
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setData(null)
    setError(null)
  }

  return { data, error, loading, shorten, reset }
}

function isShortenResponse(data) {
  return data &&
    typeof data === 'object' &&
    typeof data.code === 'string' &&
    typeof data.url === 'string' &&
    typeof data.shortPath === 'string'
}
