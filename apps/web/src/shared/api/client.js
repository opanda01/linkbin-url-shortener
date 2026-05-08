import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_CONFIG_ERROR = !configuredApiUrl && import.meta.env.PROD
  ? 'API adresi yapılandırılmamış. Render web servisinde VITE_API_URL değerini API servis URL’i olarak ayarlayın ve yeniden deploy edin.'
  : null

export const API_BASE_URL = (configuredApiUrl || 'http://localhost:3001').replace(/\/+$/, '')

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})
