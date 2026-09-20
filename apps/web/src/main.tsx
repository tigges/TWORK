import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './routes/router'
import { ChatPreview } from './pages/build/ChatPreview'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 0, // fail fast → demo fallback triggers immediately
    },
  },
})

const root = document.getElementById('root')!
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* Floating chat widget — visible on all pages for quick test runs */}
      <ChatPreview />
    </QueryClientProvider>
  </React.StrictMode>
)
