/**
 * Captures README screenshots from a running Linkbin web app (local or live).
 * Usage: node infra/scripts/capture-readme-screenshots.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../../docs/readme')
const baseUrl = (process.argv[2] || 'https://linkbin-web.onrender.com').replace(/\/$/, '')
const apiUrl =
  process.env.VITE_API_URL ||
  (baseUrl.includes('onrender.com') ? 'https://linkbin-api.onrender.com' : 'http://localhost:3001')

async function waitForApp(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByRole('heading', { name: 'Linkbin' }).waitFor({ timeout: 120_000 })
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  try {
    await waitForApp(page)
    await page.screenshot({ path: path.join(outDir, 'shorten-form.png') })

    const longUrl = 'https://github.com/opanda01/linkbin-url-shortener'
    await page.getByPlaceholder(/https:\/\//i).fill(longUrl)
    await page.getByRole('button', { name: 'Kısalt' }).click()
    await page.getByRole('button', { name: 'Kopyala' }).waitFor({ timeout: 60_000 })
    await page.screenshot({ path: path.join(outDir, 'shorten-result.png') })

    const res = await fetch(`${apiUrl}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/readme-demo', alias: 'readme-demo' }),
    })
    if (res.ok) {
      const { code } = await res.json()
      await page.goto(`${baseUrl}/${code}/stats`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.getByRole('heading', { name: 'İstatistikler' }).waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      await page.screenshot({ path: path.join(outDir, 'analytics.png') })
    } else {
      console.warn('Stats seed failed; skipping analytics screenshot', res.status)
    }
  } finally {
    await browser.close()
  }

  console.log('Screenshots written to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
