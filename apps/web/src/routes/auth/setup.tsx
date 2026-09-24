import { useNavigate } from '@tanstack/react-router'
import { Fingerprint } from 'lucide-react'
import { useState } from 'react'
import { registerPasskey } from '../../lib/auth.js'

export function SetupPage() {
  const [email,   setEmail]   = useState('')
  const [label,   setLabel]   = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const navigate = useNavigate()

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registerPasskey(email.trim(), label.trim() || undefined)
      setDone(true)
      setTimeout(() => navigate({ to: '/auth/login' }), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg select-none">
            TW
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Register a passkey
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            One-time setup. Your email must already exist in the system.
          </p>
        </div>

        {done ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 text-center">
            Passkey registered — redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@twork.local"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Passkey label <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="MacBook Touch ID"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Fingerprint size={20} />
              {loading ? 'Creating passkey…' : 'Register passkey'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-zinc-400">
          Already have a passkey?{' '}
          <a href="/auth/login" className="text-indigo-500 hover:text-indigo-400 underline underline-offset-2">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
