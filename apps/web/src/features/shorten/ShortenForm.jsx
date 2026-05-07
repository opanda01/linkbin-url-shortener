import { useState } from 'react'
import { Input } from '../../shared/ui/Input.jsx'
import { Button } from '../../shared/ui/Button.jsx'

export function ShortenForm({ onSubmit, loading }) {
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    onSubmit({ url: url.trim(), alias: alias.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="URL"
        type="url"
        placeholder="https://ornek.com/uzun-bir-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <Input
        label="Özel kısaltma (isteğe bağlı)"
        type="text"
        placeholder="ornek-isim"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
      />
      <Button type="submit" loading={loading}>
        Kısalt
      </Button>
    </form>
  )
}
