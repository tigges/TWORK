import React, { useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { NavRail } from './NavRail'
import { TopBar } from './TopBar'
import { useAppStore } from '../store/app'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  React.useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <NavRail
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
