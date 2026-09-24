/**
 * Passkey (WebAuthn) registration and authentication routes.
 * Auth library: @simplewebauthn/server v10 (maintained; handles all crypto).
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { FastifyInstance } from 'fastify'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { DB } from '@twork/db'
import { passkeys, sessions, users, webauthnChallenges } from '@twork/db'
import { randomBytes } from 'node:crypto'

const SESSION_TTL_DAYS = 30

export function authRoutes(
  app:  FastifyInstance,
  db:   DB,
  env:  { rpId: string; rpName: string; origin: string },
) {
  // ── Registration ────────────────────────────────────────────────────────────

  app.post('/auth/passkey/register-start', async (req, reply) => {
    const body = req.body as { email?: string }
    if (!body?.email) return reply.status(400).send({ error: 'email required' })

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, body.email), isNull(users.deletedAt)))
      .limit(1)

    if (!user) return reply.status(404).send({ error: 'user not found' })

    const existingPasskeys = await db
      .select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
      .from(passkeys)
      .where(and(eq(passkeys.userId, user.id), isNull(passkeys.deletedAt)))

    const options = await generateRegistrationOptions({
      rpName:             env.rpName,
      rpID:               env.rpId,
      userID:             new TextEncoder().encode(user.id),
      userName:           user.email,
      userDisplayName:    user.displayName,
      attestationType:    'none',
      excludeCredentials: existingPasskeys.map(pk => ({
        id:         pk.credentialId,
        transports: (pk.transports ?? []) as ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb')[],
      })),
      authenticatorSelection: {
        residentKey:      'preferred',
        userVerification: 'preferred',
      },
    })

    const challengeId = uuidv7()
    const expiresAt   = new Date(Date.now() + 5 * 60 * 1000)

    await db.insert(webauthnChallenges).values({
      id:        challengeId,
      userId:    user.id,
      challenge: options.challenge,
      type:      'registration',
      expiresAt,
    })

    return reply.send({ challengeId, options })
  })

  app.post('/auth/passkey/register-finish', async (req, reply) => {
    const body = req.body as { challengeId?: string; credential?: unknown; label?: string }
    if (!body?.challengeId || !body?.credential) {
      return reply.status(400).send({ error: 'challengeId and credential required' })
    }

    const now = new Date()
    const [challenge] = await db
      .select()
      .from(webauthnChallenges)
      .where(
        and(
          eq(webauthnChallenges.id,   body.challengeId),
          eq(webauthnChallenges.type, 'registration'),
          gt(webauthnChallenges.expiresAt, now),
        ),
      )
      .limit(1)

    if (!challenge?.userId) {
      return reply.status(400).send({ error: 'invalid or expired challenge' })
    }

    let verification
    try {
      verification = await verifyRegistrationResponse({
        response:           body.credential as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge:  challenge.challenge,
        expectedOrigin:     env.origin,
        expectedRPID:       env.rpId,
        requireUserVerification: false,
      })
    } catch (err) {
      return reply.status(400).send({ error: String(err) })
    }

    if (!verification.verified || !verification.registrationInfo) {
      return reply.status(400).send({ error: 'verification failed' })
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    await db.insert(passkeys).values({
      id:           uuidv7(),
      userId:       challenge.userId,
      credentialId: credentialID,
      publicKey:    Buffer.from(credentialPublicKey).toString('base64url'),
      counter:      counter,
      transports:   null,
      label:        body.label ?? null,
    })

    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, body.challengeId))

    return reply.send({ ok: true })
  })

  // ── Authentication ──────────────────────────────────────────────────────────

  app.post('/auth/passkey/auth-start', async (_req, reply) => {
    const allPasskeys = await db
      .select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
      .from(passkeys)
      .where(isNull(passkeys.deletedAt))

    const options = await generateAuthenticationOptions({
      rpID:             env.rpId,
      userVerification: 'preferred',
      allowCredentials: allPasskeys.map(pk => ({
        id:         pk.credentialId,
        transports: (pk.transports ?? []) as ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb')[],
      })),
    })

    const challengeId = uuidv7()
    const expiresAt   = new Date(Date.now() + 5 * 60 * 1000)

    await db.insert(webauthnChallenges).values({
      id:        challengeId,
      userId:    null,
      challenge: options.challenge,
      type:      'authentication',
      expiresAt,
    })

    return reply.send({ challengeId, options })
  })

  app.post('/auth/passkey/auth-finish', async (req, reply) => {
    const body = req.body as { challengeId?: string; credential?: unknown }
    if (!body?.challengeId || !body?.credential) {
      return reply.status(400).send({ error: 'challengeId and credential required' })
    }

    const now = new Date()
    const [challenge] = await db
      .select()
      .from(webauthnChallenges)
      .where(
        and(
          eq(webauthnChallenges.id,   body.challengeId),
          eq(webauthnChallenges.type, 'authentication'),
          gt(webauthnChallenges.expiresAt, now),
        ),
      )
      .limit(1)

    if (!challenge) return reply.status(400).send({ error: 'invalid or expired challenge' })

    const credResp = body.credential as { id: string }
    const [passkey] = await db
      .select()
      .from(passkeys)
      .where(and(eq(passkeys.credentialId, credResp.id), isNull(passkeys.deletedAt)))
      .limit(1)

    if (!passkey) return reply.status(400).send({ error: 'passkey not found' })

    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response:          body.credential as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
        expectedChallenge: challenge.challenge,
        expectedOrigin:    env.origin,
        expectedRPID:      env.rpId,
        authenticator: {
          credentialPublicKey:  Buffer.from(passkey.publicKey, 'base64url'),
          credentialID:         passkey.credentialId,
          counter:              passkey.counter,
          transports:           (passkey.transports ?? []) as ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb')[],
        },
        requireUserVerification: false,
      })
    } catch (err) {
      return reply.status(400).send({ error: String(err) })
    }

    if (!verification.verified) {
      return reply.status(401).send({ error: 'authentication failed' })
    }

    await db
      .update(passkeys)
      .set({ counter: verification.authenticationInfo.newCounter, updatedAt: now })
      .where(eq(passkeys.id, passkey.id))

    const token     = randomBytes(32).toString('base64url')
    const sessionId = uuidv7()
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

    await db.insert(sessions).values({
      id:        sessionId,
      userId:    passkey.userId,
      token,
      expiresAt,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip,
    })

    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, body.challengeId))

    reply.setCookie('session', token, {
      httpOnly: true,
      secure:   env.origin.startsWith('https'),
      sameSite: 'lax',
      path:     '/',
      expires:  expiresAt,
    })

    const [user] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, passkey.userId))
      .limit(1)

    return reply.send({ ok: true, user })
  })

  // ── Me / Logout ─────────────────────────────────────────────────────────────

  app.get('/auth/me', async (req, reply) => {
    const token = req.cookies?.['session']
    if (!token) return reply.status(401).send({ user: null })

    const now = new Date()
    const [row] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now), isNull(sessions.deletedAt)))
      .limit(1)

    if (!row) return reply.status(401).send({ user: null })
    return reply.send({ user: row })
  })

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies?.['session']
    if (token) {
      await db
        .update(sessions)
        .set({ deletedAt: new Date() })
        .where(eq(sessions.token, token))
    }
    reply.clearCookie('session', { path: '/' })
    return reply.send({ ok: true })
  })
}
