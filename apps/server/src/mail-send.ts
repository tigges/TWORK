import { uuidv7 } from 'uuidv7'
import { mailDomain } from './mailbox.js'

export function buildRfc5322(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
  inReplyTo?:  string
}): Buffer {
  const domain = mailDomain()
  const from = input.fromName
    ? `${encodeHeader(safeHeader(input.fromName))} <${safeHeader(input.fromAddress)}>`
    : safeHeader(input.fromAddress)
  const headers = [
    `From: ${from}`,
    `To: ${safeHeader(input.to)}`,
  ]
  if (input.cc.length > 0) headers.push(`Cc: ${headerAddresses(input.cc)}`)
  // Kept on the sender's copy so the mailbox can show who was blind-copied.
  // The provider gets Bcc as its own field and does not put it on other recipients' copies.
  if (input.bcc.length > 0) headers.push(`Bcc: ${headerAddresses(input.bcc)}`)
  headers.push(
    `Subject: ${encodeHeader(safeHeader(input.subject))}`,
    `Date: ${new Date().toUTCString().replace(/GMT$/, '+0000')}`,
    `Message-ID: <${uuidv7()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  )
  if (input.inReplyTo) {
    const ref = safeHeader(input.inReplyTo)
    headers.push(`In-Reply-To: ${ref}`, `References: ${ref}`)
  }
  const body = input.text.replace(/\r?\n/g, '\r\n')
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body}`, 'utf8')
}

export function outboundConfigured(): boolean {
  return Boolean(process.env['RESEND_API_KEY'] || process.env['MAILGUN_API_KEY'])
}

export async function deliverMail(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
}): Promise<void> {
  if (process.env['RESEND_API_KEY']) return deliverResend(input)
  return deliverMailgun(input)
}

async function deliverResend(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
}): Promise<void> {
  const key = process.env['RESEND_API_KEY']
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const from = input.fromName
    ? `${safeHeader(input.fromName)} <${safeHeader(input.fromAddress)}>`
    : safeHeader(input.fromAddress)
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to:      [input.to],
      ...(input.cc.length > 0 ? { cc: input.cc } : {}),
      ...(input.bcc.length > 0 ? { bcc: input.bcc } : {}),
      subject: input.subject,
      text:    input.text,
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`mail provider rejected the message (${res.status}): ${detail.slice(0, 300)}`)
  }
}

async function deliverMailgun(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
}): Promise<void> {
  const key = process.env['MAILGUN_API_KEY']
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const domain = process.env['MAILGUN_DOMAIN'] ?? mailDomain()
  const base   = process.env['MAILGUN_API_BASE'] ?? 'https://api.mailgun.net'
  const from = input.fromName
    ? `${safeHeader(input.fromName)} <${safeHeader(input.fromAddress)}>`
    : safeHeader(input.fromAddress)
  const body = new URLSearchParams({
    from,
    to:      input.to,
    subject: input.subject,
    text:    input.text,
  })
  if (input.cc.length > 0) body.set('cc', input.cc.join(', '))
  if (input.bcc.length > 0) body.set('bcc', input.bcc.join(', '))
  const res = await fetch(`${base}/v3/${domain}/messages`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(`api:${key}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`mail provider rejected the message (${res.status}): ${detail.slice(0, 300)}`)
  }
}

function headerAddresses(values: string[]): string {
  return values.map(safeHeader).join(', ')
}

function safeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}
