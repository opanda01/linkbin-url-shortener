import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // chart.js canvas gerektiriyor — test ortamında mock'la
    alias: {
      'chart.js': new URL('./src/test/__mocks__/chart.js.js', import.meta.url).pathname,
      'react-chartjs-2': new URL('./src/test/__mocks__/react-chartjs-2.js', import.meta.url).pathname,
    },
  },
})
