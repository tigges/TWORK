import { useNavigate } from '@tanstack/react-router'
import { Fingerprint } from 'lucide-react'
import { useState } from 'react'
import { loginWithPasskey } from '../../lib/auth.js'
import { useAuth } from '../../main.js'
import { appVersion } from '../../version.js'

export function LoginPage() {
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()
  const { refetch } = useAuth()

  async function handlePasskey() {
    setError(null)
    setLoading(true)
    try {
      await loginWithPasskey()
      await refetch()
      navigate({ to: '/mail' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg select-none">
            TW
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign in to TWork
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Use your registered passkey to continue
          </p>
        </div>

        {/* Passkey button */}
        <button
          onClick={handlePasskey}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <Fingerprint size={20} />
          {loading ? 'Waiting for passkey…' : 'Sign in with passkey'}
        </button>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        )}

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          No passkey yet?{' '}
          <a href="/auth/setup" className="text-indigo-500 hover:text-indigo-400 underline underline-offset-2">
            Register one
          </a>
        </p>
        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600" title={`Version ${appVersion}`}>
          {appVersion}
        </p>
      </div>
    </div>
  )
}
