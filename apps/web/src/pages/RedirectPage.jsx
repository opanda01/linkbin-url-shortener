import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE_URL, API_CONFIG_ERROR } from '../shared/api/client.js'
import { Spinner } from '../shared/ui/Spinner.jsx'

export default function RedirectPage() {
  const { code } = useParams()

  useEffect(() => {
    if (!code || API_CONFIG_ERROR) return
    window.location.replace(`${API_BASE_URL}/${encodeURIComponent(code)}`)
  }, [code])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {API_CONFIG_ERROR ? (
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-red-500">{API_CONFIG_ERROR}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Spinner />
          <p className="text-sm">Yönlendiriliyorsunuz...</p>
        </div>
      )}
    </main>
  )
}
