/** Address on this server's domain. Login email may be a different domain. */
export function mailDomain(): string {
  const configured = process.env['MAIL_DOMAIN']
  if (configured) return configured
  const pub = process.env['PUBLIC_URL']
  if (pub) {
    try { return new URL(pub).hostname } catch { /* ignore */ }
  }
  return 'localhost'
}

export function mailboxAddress(userEmail: string): string {
  const from = process.env['MAIL_FROM']
  if (from) return from
  const local = userEmail.split('@')[0]?.trim() || 'mail'
  return `${local}@${mailDomain()}`
}
