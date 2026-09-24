interface Props {
  icon:        React.ReactNode
  name:        string
  description: string
}

export function ModulePlaceholder({ icon, name, description }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-400 dark:text-zinc-600 select-none">
      <div className="text-zinc-300 dark:text-zinc-700">{icon}</div>
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{name}</p>
        <p className="text-sm max-w-xs text-zinc-500 dark:text-zinc-500">{description}</p>
      </div>
      <div className="mt-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Phase 1 — foundation complete
      </div>
    </div>
  )
}
