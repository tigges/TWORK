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
import { MailPage }     from './routes/mail.js'
import { ContactsPage } from './routes/contacts.js'
import { FilesPage }    from './routes/files.js'
import { PagesPage }    from './routes/pages.js'
import { CalendarPage } from './routes/calendar.js'
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
  beforeLoad:     ({ context }) => { if (!context.auth.isLoading) throw redirect({ to: '/mail' }) },
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

const mailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/mail',
  beforeLoad:     ({ context }) => requireAuth(context),
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search['to']
    if (typeof raw !== 'string') return {}
    const to = raw.trim()
    if (!to.includes('@') || to.length > 320) return {}
    return { to }
  },
  component: MailPage,
})

const contactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/contacts',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      ContactsPage,
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

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path:           '/calendar',
  beforeLoad:     ({ context }) => requireAuth(context),
  component:      CalendarPage,
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
  mailRoute,
  contactsRoute,
  filesRoute,
  pagesRoute,
  calendarRoute,
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
