import { useState, useEffect } from 'react'
import { API_CONFIG_ERROR, apiClient } from '../../shared/api/client.js'

export function useStats(code) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return

    let cancelled = false

    async function fetchStats() {
      if (API_CONFIG_ERROR) {
        setError(API_CONFIG_ERROR)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const res = await apiClient.get(`/api/stats/${code}`)
        if (!cancelled) setData(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'İstatistikler alınamadı')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()

    return () => {
      cancelled = true
    }
  }, [code])

  return { data, error, loading }
}
