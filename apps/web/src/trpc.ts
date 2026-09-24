import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@twork/server'

export const trpc = createTRPCReact<AppRouter>()

export function makeTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url:   '/trpc',
        fetch: (url, opts) => fetch(url as RequestInfo, { ...opts, credentials: 'include' }),
      }),
    ],
  })
}
