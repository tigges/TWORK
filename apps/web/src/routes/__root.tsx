import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Shell } from '../components/Shell.js'
import { useAuth } from '../main.js'

const PUBLIC_PATHS = ['/auth/login', '/auth/setup']

export function RootLayout() {
  const { user, isLoading } = useAuth()
  const navigate  = useNavigate()
  const pathname  = useRouterState({ select: s => s.location.pathname })

  const isPublic  = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const needsAuth = !isLoading && !user && !isPublic

  // Redirect to login whenever auth state resolves and user is absent
  useEffect(() => {
    if (needsAuth) {
      void navigate({ to: '/auth/login' })
    }
  }, [needsAuth, navigate])

  // Show spinner while resolving auth, or if about to redirect
  if (isLoading || needsAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (isPublic) {
    return <Outlet />
  }

  return (
    <Shell user={user}>
      <Outlet />
    </Shell>
  )
}
