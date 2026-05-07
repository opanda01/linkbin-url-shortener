import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'

export function Providers() {
  return <RouterProvider router={router} />
}
