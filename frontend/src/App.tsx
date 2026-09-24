import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Link, Navigate, RouterProvider, createBrowserRouter } from 'react-router'
import { ApiError } from './api/client'
import { AppLayout } from './components/AppLayout'
import { EmptyState } from './components/StateViews'
import { LeadDetailPage } from './pages/LeadDetailPage'
import { LeadListPage } from './pages/LeadListPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/leads" replace /> },
      { path: 'leads', element: <LeadListPage /> },
      { path: 'leads/:id', element: <LeadDetailPage /> },
      {
        path: '*',
        element: (
          <EmptyState title="Page not found">
            <Link to="/leads">Go to leads</Link>
          </EmptyState>
        ),
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
