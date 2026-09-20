import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CurrentUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string | null
  tenantId: string
  role: string
}

export interface Bot {
  id: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  status: string
  environments: Array<{
    id: string
    kind: string
    name: string
  }>
}

interface AppStore {
  user: CurrentUser | null
  token: string | null
  bots: Bot[]
  selectedBotId: string | null
  selectedEnv: 'sandbox' | 'production'

  setAuth: (user: CurrentUser, token: string) => void
  clearAuth: () => void
  setBots: (bots: Bot[]) => void
  selectBot: (botId: string) => void
  setEnv: (env: 'sandbox' | 'production') => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      bots: [],
      selectedBotId: null,
      selectedEnv: 'sandbox',

      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null, bots: [], selectedBotId: null }),
      setBots: (bots) =>
        set((state) => ({
          bots,
          selectedBotId: state.selectedBotId ?? bots[0]?.id ?? null,
        })),
      selectBot: (botId) => set({ selectedBotId: botId }),
      setEnv: (env) => set({ selectedEnv: env }),
    }),
    {
      name: 'ybot-app',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        selectedBotId: state.selectedBotId,
        selectedEnv: state.selectedEnv,
      }),
    }
  )
)
