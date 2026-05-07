import { useClipboard } from '../../shared/hooks/useClipboard.js'
import { Button } from '../../shared/ui/Button.jsx'

export function ShortenResult({ data, onReset }) {
  const shortUrl = `${window.location.origin}/${data.code}`
  const { copied, copy } = useClipboard()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-violet-600 font-medium text-sm truncate hover:underline"
        >
          {shortUrl}
        </a>
        <Button variant="secondary" onClick={() => copy(shortUrl)}>
          {copied ? '✓ Kopyalandı' : 'Kopyala'}
        </Button>
      </div>

      <div className="flex gap-2">
        <a
          href={`/${data.code}/stats`}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          İstatistikleri gör
        </a>
        <span className="text-gray-300">|</span>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Yeni kısalt
        </button>
      </div>
    </div>
  )
}
