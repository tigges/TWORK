import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card } from '@ybot/ui'
import { useAppStore } from '../store/app'
import { apiFetch } from '../lib/api'

type Mode = 'login' | 'register'

export function SignInPage() {
  const navigate = useNavigate()
  const { setAuth, setBots } = useAppStore()
  const [mode, setMode] = useState<Mode>('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    tenantName: '',
    tenantSlug: '',
  })

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'tenantName' && mode === 'register') {
      setForm((f) => ({
        ...f,
        [field]: value,
        tenantSlug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      }))
    }
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : form

      const res = await apiFetch<{ data: { token: string; user: Parameters<typeof setAuth>[0] } }>(
        endpoint,
        { method: 'POST', body: JSON.stringify(body) }
      )

      setAuth(res.data.user, res.data.token)

      const botsRes = await apiFetch<{ data: Parameters<typeof setBots>[0] }>('/bots')
      setBots(botsRes.data)

      navigate({ to: '/overview' })
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)]">
            <Bot size={24} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">YBot Console</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <Input
                  label="Your name"
                  placeholder="Charles"
                  value={form.displayName}
                  onChange={(e) => update('displayName', e.target.value)}
                  required
                />
                <Input
                  label="Workspace name"
                  placeholder="Acme Corp"
                  value={form.tenantName}
                  onChange={(e) => update('tenantName', e.target.value)}
                  required
                />
                <Input
                  label="Workspace URL"
                  placeholder="acme-corp"
                  value={form.tenantSlug}
                  onChange={(e) => update('tenantSlug', e.target.value)}
                  hint="ybot.ai/acme-corp"
                  required
                />
              </>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />

            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              rightIcon={
                <button type="button" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
              required
            />

            {error && (
              <p className="text-xs text-[var(--error)] rounded bg-[var(--error-muted)] px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-[var(--text-muted)]">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[var(--text-link)] hover:underline"
                >
                  Create workspace
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[var(--text-link)] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          YBot Conversational AI Console
        </p>
      </div>
    </div>
  )
}
