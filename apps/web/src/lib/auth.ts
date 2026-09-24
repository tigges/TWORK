import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types'

async function post<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method:      'POST',
    credentials: 'include',
  }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body    = JSON.stringify(body)
  }
  const res  = await fetch(path, init)
  const data = await res.json() as T & { error?: string }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  return data
}

export interface MeResponse {
  user: { id: string; email: string; displayName: string } | null
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch('/auth/me', { credentials: 'include' })
  return res.json() as Promise<MeResponse>
}

export async function logout(): Promise<void> {
  await post('/auth/logout')
}

export async function registerPasskey(email: string, label?: string): Promise<void> {
  const { challengeId, options } = await post<{
    challengeId: string
    options:     PublicKeyCredentialCreationOptionsJSON
  }>('/auth/passkey/register-start', { email })

  const credential = await startRegistration(options)
  await post('/auth/passkey/register-finish', { challengeId, credential, label })
}

export async function loginWithPasskey(): Promise<{
  user: { id: string; email: string; displayName: string }
}> {
  const { challengeId, options } = await post<{
    challengeId: string
    options:     PublicKeyCredentialRequestOptionsJSON
  }>('/auth/passkey/auth-start')

  const credential = await startAuthentication(options)
  return post('/auth/passkey/auth-finish', { challengeId, credential })
}
