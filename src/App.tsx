import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/shell/AppShell'
import RouteError from '@/components/shell/RouteError'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { SessionProvider } from '@/features/auth/SessionProvider'
import SignInPage from '@/features/auth/SignInPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import AccountPage from '@/features/account/AccountPage'
import { ConsentGate } from '@/features/legal/ConsentGate'
import ImprintPage from '@/features/legal/ImprintPage'
import { LegalShell } from '@/features/legal/LegalShell'
import PrivacyPage from '@/features/legal/PrivacyPage'
import CardioPage from '@/features/cardio/CardioPage'
import NotFoundPage from '@/features/account/NotFoundPage'
import FoodPage from '@/features/nutrition/FoodPage'
import AddFoodPage from '@/features/nutrition/AddFoodPage'
import LoggedPortionPage from '@/features/nutrition/LoggedPortionPage'
import GoalsPage from '@/features/goals/GoalsPage'
import WeekPage from '@/features/training/WeekPage'
import SessionPage from '@/features/training/SessionPage'
import TrainingPage from '@/features/training/TrainingPage'
import AddExercisePage from '@/features/training/AddExercisePage'
import RoutineEditorPage from '@/features/routines/RoutineEditorPage'

// Weight is the only screen that pulls in Recharts, which is a third of the
// bundle. Split out, it is fetched by the people who open it rather than by
// everyone on a gym connection.
const WeightPage = lazy(() => import('@/features/weight/WeightPage'))

// One route, one file (DESIGN.md §7). Everything except /sign-in sits behind
// RequireAuth — there is no public page in Merit and no open sign-up.
const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInPage />, errorElement: <RouteError /> },

  // Outside RequireAuth on purpose. A privacy notice only a signed-in user can
  // read is not published, and § 5 DDG wants an imprint that is `leicht
  // erkennbar, unmittelbar erreichbar und ständig verfügbar`, which is not what
  // a login wall is. They carry the theme and the locale and nothing else.
  {
    element: <LegalShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/legal/privacy', element: <PrivacyPage /> },
      { path: '/legal/imprint', element: <ImprintPage /> },
    ],
  },

  {
    element: <RequireAuth />,
    // On the auth boundary rather than deeper, so it catches a route that
    // throws *and* a lazy chunk that never arrives — the second is what a tab
    // left open across a deploy hits, and it happens before any screen mounts.
    errorElement: <RouteError />,
    children: [
      {
        // Explicit Art. 9(2)(a) consent stands between being signed in and using
        // the app: inside RequireAuth because it needs an account to attach to,
        // outside AppShell because it is not a screen of the app but the
        // question asked before there is one.
        element: <ConsentGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/food', element: <FoodPage /> },
              { path: '/food/add', element: <AddFoodPage /> },
              { path: '/food/entry/:id', element: <LoggedPortionPage /> },
              { path: '/training', element: <WeekPage /> },
              { path: '/training/day', element: <TrainingPage /> },
              { path: '/training/session', element: <SessionPage /> },
              { path: '/training/add', element: <AddExercisePage /> },
              { path: '/training/routines/:id', element: <RoutineEditorPage /> },
              { path: '/account', element: <AccountPage /> },
              { path: '/cardio', element: <CardioPage /> },
              { path: '/weight', element: <WeightPage /> },
              { path: '/goals', element: <GoalsPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
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
