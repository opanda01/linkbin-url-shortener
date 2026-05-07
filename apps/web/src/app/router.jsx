import { createBrowserRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage.jsx'
import StatsPage from '../pages/StatsPage.jsx'
import RedirectPage from '../pages/RedirectPage.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/:code/stats',
    element: <StatsPage />,
  },
  {
    path: '/:code',
    element: <RedirectPage />,
  },
])
