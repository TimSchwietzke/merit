import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/shell/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { SessionProvider } from '@/features/auth/SessionProvider'
import SignInPage from '@/features/auth/SignInPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import MorePage from '@/features/more/MorePage'
import NotFoundPage from '@/features/more/NotFoundPage'
import FoodPage from '@/features/nutrition/FoodPage'
import AddFoodPage from '@/features/nutrition/AddFoodPage'
import TrainingPage from '@/features/training/TrainingPage'

// Weight is the only screen that pulls in Recharts, which is a third of the
// bundle. Split out, it is fetched by the people who open it rather than by
// everyone on a gym connection.
const WeightPage = lazy(() => import('@/features/weight/WeightPage'))

// One route, one file (DESIGN.md §7). Everything except /sign-in sits behind
// RequireAuth — there is no public page in Merit and no open sign-up.
const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/food', element: <FoodPage /> },
          { path: '/food/add', element: <AddFoodPage /> },
          { path: '/training', element: <TrainingPage /> },
          { path: '/more', element: <MorePage /> },
          { path: '/weight', element: <WeightPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
