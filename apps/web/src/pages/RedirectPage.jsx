import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE_URL } from '../shared/api/client.js'
import { Spinner } from '../shared/ui/Spinner.jsx'

export default function RedirectPage() {
  const { code } = useParams()

  useEffect(() => {
    if (!code) return
    window.location.replace(`${API_BASE_URL}/${encodeURIComponent(code)}`)
  }, [code])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-gray-600">
        <Spinner />
        <p className="text-sm">Yönlendiriliyorsunuz...</p>
      </div>
    </main>
  )
}
