import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SKEW_SECONDS = 5 * 60

export function verifyResendWebhook(
  secret: string,
  headers: { id: string | undefined; timestamp: string | undefined; signature: string | undefined },
  rawBody: string,
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false
  const key = webhookKey(secret)
  if (!key) return false
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64')
  return signature.split(' ').some(part => {
    const [version, value] = part.split(',', 2)
    return version === 'v1' && !!value && safeEqual(expected, value)
  })
}

/** Download the original RFC 5322 message for a Resend email.received event. */
export async function fetchResendRawMessage(apiKey: string, emailId: string): Promise<Buffer> {
  if (!/^[A-Za-z0-9-]+$/.test(emailId)) throw new Error('unexpected resend email id')
  const meta = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!meta.ok) {
    const detail = await meta.text()
    throw new Error(`resend could not load the message (${meta.status}): ${detail.slice(0, 200)}`)
  }
  const body = await meta.json() as { raw?: { download_url?: string } }
  const url = body.raw?.download_url
  if (!url || !url.startsWith('https://')) throw new Error('resend did not return the original message')
  const raw = await fetch(url)
  if (!raw.ok) throw new Error(`resend raw download failed (${raw.status})`)
  return Buffer.from(await raw.arrayBuffer())
}

function webhookKey(secret: string): Buffer | null {
  const encoded = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  try {
    const key = Buffer.from(encoded, 'base64')
    return key.length > 0 ? key : null
  } catch {
    return null
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
