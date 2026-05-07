import { ShortenForm } from '../features/shorten/ShortenForm.jsx'
import { ShortenResult } from '../features/shorten/ShortenResult.jsx'
import { useShorten } from '../features/shorten/useShorten.js'

export default function HomePage() {
  const { data, error, loading, shorten, reset } = useShorten()

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Linkbin</h1>
          <p className="text-gray-500 mt-2">URL'leri kısalt, paylaş, takip et</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {data ? (
            <ShortenResult data={data} onReset={reset} />
          ) : (
            <ShortenForm onSubmit={shorten} loading={loading} />
          )}

          {error ? (
            <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
          ) : null}
        </div>
      </div>
    </main>
  )
}
