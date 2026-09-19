import React, { useState } from 'react'
import { PageHeader, Card, Button, Input, Badge, Avatar } from '@ybot/ui'
import { useAppStore } from '../store/app'
import { Sun, Moon } from 'lucide-react'

export function SettingsPage() {
  const { user } = useAppStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Account and workspace settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-lg space-y-6">
          {/* Profile */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Profile</h3>
            <div className="flex items-center gap-4 mb-4">
              <Avatar name={user?.displayName} size="lg" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{user?.displayName}</p>
                <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                <Badge variant="muted" className="mt-1">{user?.role}</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input label="Email" value={user?.email ?? ''} disabled />
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="md" onClick={handleSave}>
                {saved ? 'Saved!' : 'Save changes'}
              </Button>
            </div>
          </Card>

          {/* Password */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Change Password</h3>
            <div className="space-y-3">
              <Input label="Current password" type="password" placeholder="••••••••" />
              <Input label="New password" type="password" placeholder="••••••••" />
              <Input label="Confirm new password" type="password" placeholder="••••••••" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="md" variant="secondary">Update password</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
