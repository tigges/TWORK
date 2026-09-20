import type { FastifyRequest, FastifyReply } from 'fastify'

// Type augmentation so `app.authenticate` resolves in all route files
declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>
    broadcastToTenant(tenantId: string, event: object): void
    jwt: {
      sign(payload: object, options?: object): string
      verify<T = unknown>(token: string, options?: object): T
    }
  }
}
