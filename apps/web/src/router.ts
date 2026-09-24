import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

// Route components are imported at the bottom of this file to avoid circular deps
import { RootLayout }   from './routes/__root.js'
import { LoginPage }    from './routes/auth/login.js'
import { SetupPage }    from './routes/auth/setup.js'
import { PostPage }     from './routes/post.js'
import { FilesPage }    from './routes/files.js'
import { PagesPage }    from './routes/pages.js'
import { SchedulePage } from './routes/schedule.js'
import { RoomsPage }    from './routes/rooms.js'

// ── Router context ────────────────────────────────────────────────────────────

export interface RouterCtx {
  queryClient: QueryClient
  auth: {
    user:      { id: string; email: string; displayName: string } | null
    isLoading: boolean
  }
}

function requireAuth(ctx: RouterCtx) {
  if (!ctx.auth.isLoading && !ctx.auth.user) {
    throw redirect({ to: '/auth/login' })
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

const rootRoute = createRootRouteWithContext<RouterCtx>()({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/',
  beforeLoad:     ({ context }) => { if (!context.auth.isLoading) throw redirect({ to: '/post' }) },
  component:      () => null,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/auth/login',
  component:      LoginPage,
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/auth/setup',
  component:      SetupPage,
})

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/post',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      PostPage,
})

const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/files',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      FilesPage,
})

const pagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/pages',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      PagesPage,
})

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/schedule',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      SchedulePage,
})

const roomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/rooms',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      RoomsPage,
})

// ── Router ────────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  setupRoute,
  postRoute,
  filesRoute,
  pagesRoute,
  scheduleRoute,
  roomsRoute,
])

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined as unknown as QueryClient,
    auth:        { user: null, isLoading: true },
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
