import { TRPCError, initTRPC } from '@trpc/server'
import type { Context } from './context.js'

const t = initTRPC.context<Context>().create()

export const router    = t.router
export const procedure = t.procedure

/** Requires a valid session — throws UNAUTHORIZED otherwise. */
export const authed = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user:    ctx.user,
    },
  })
})
