import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/shell/AppShell'
import DashboardPage from '@/features/dashboard/DashboardPage'
import MorePage from '@/features/more/MorePage'
import NotFoundPage from '@/features/more/NotFoundPage'
import FoodPage from '@/features/nutrition/FoodPage'
import TrainingPage from '@/features/training/TrainingPage'

// One route, one file (DESIGN.md §7).
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/food', element: <FoodPage /> },
      { path: '/training', element: <TrainingPage /> },
      { path: '/more', element: <MorePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
