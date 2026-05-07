import { createBrowserRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage.jsx'
import StatsPage from '../pages/StatsPage.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/:code/stats',
    element: <StatsPage />,
  },
])
