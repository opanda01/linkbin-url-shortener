import { useParams, Link } from 'react-router-dom'
import { useStats } from '../features/stats/useStats.js'
import { StatsCard } from '../features/stats/StatsCard.jsx'
import { ClicksChart } from '../features/stats/ClicksChart.jsx'
import { Spinner } from '../shared/ui/Spinner.jsx'

export default function StatsPage() {
  const { code } = useParams()
  const { data, error, loading } = useStats(code)

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">İstatistikler</h1>
          <Link to="/" className="text-sm text-violet-600 hover:underline">
            ← Ana Sayfa
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          ) : data ? (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <StatsCard data={data} />
              </div>
              <ClicksChart series={data.series} />
            </>
          ) : null}
        </div>
      </div>
    </main>
  )
}
