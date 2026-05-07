import { formatDate, formatNumber } from '../../shared/utils/format.js'

export function StatsCard({ data }) {
  const shortUrl = `${window.location.origin}/${data.code}`

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Toplam Tıklama" value={formatNumber(data.clicks)} />
        <Metric label="Oluşturulma" value={formatDate(data.createdAt)} />
        {data.lastClickAt ? (
          <Metric label="Son Tıklama" value={formatDate(data.lastClickAt)} />
        ) : null}
        {data.ttlDays != null ? (
          <Metric label="Son Kullanma" value={`${data.ttlDays} gün`} />
        ) : null}
      </div>

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm break-all">
        <p className="text-xs text-gray-400 mb-1">Kısa URL</p>
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 hover:underline font-medium"
        >
          {shortUrl}
        </a>
      </div>

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm break-all">
        <p className="text-xs text-gray-400 mb-1">Hedef URL</p>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:underline"
        >
          {data.url}
        </a>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="flex flex-col gap-1 p-4 bg-white border border-gray-200 rounded-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
