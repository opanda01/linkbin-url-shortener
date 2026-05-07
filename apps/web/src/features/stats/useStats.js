import { useState, useEffect } from 'react'
import { apiClient } from '../../shared/api/client.js'

export function useStats(code) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return

    let cancelled = false

    async function fetchStats() {
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
