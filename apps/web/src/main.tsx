import './main.css'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createContext, useContext, useMemo, useState, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getMe } from './lib/auth.js'
import { ThemeProvider } from './lib/theme.js'
import { router } from './router.js'
import { trpc, makeTrpcClient } from './trpc.js'

// ── Auth context ──────────────────────────────────────────────────────────────

interface AuthCtx {
  user:      { id: string; email: string; displayName: string } | null
  isLoading: boolean
  refetch:   () => void
}

const AuthContext = createContext<AuthCtx>({ user: null, isLoading: true, refetch: () => {} })
export const useAuth = () => useContext(AuthContext)

// ── Root app ──────────────────────────────────────────────────────────────────

function App() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  )
  const [trpcClient] = useState(makeTrpcClient)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth-me'],
    queryFn:  getMe,
    retry:    false,
  })

  const auth = useMemo<AuthCtx>(
    () => ({
      user:      data?.user ?? null,
      isLoading,
      refetch:   () => { void refetch() },
    }),
    [data, isLoading, refetch],
  )

  return (
    <AuthContext.Provider value={auth}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider
            router={router}
            context={{ queryClient, auth }}
          />
        </QueryClientProvider>
      </trpc.Provider>
    </AuthContext.Provider>
  )
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const outerQueryClient = new QueryClient()

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={outerQueryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
