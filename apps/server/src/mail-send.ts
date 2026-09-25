import { uuidv7 } from 'uuidv7'
import { cleanFileName } from './file-name.js'
import { mailDomain } from './mailbox.js'

export interface OutboundFile {
  name: string
  type: string
  data: Buffer
}

export const MAX_ATTACHMENTS = 8
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
export const MAX_ATTACHMENT_TOTAL = 20 * 1024 * 1024

export class AttachmentError extends Error {}

export function filesFromPayload(files: { name: string; type: string; data: string }[]): OutboundFile[] {
  if (files.length > MAX_ATTACHMENTS) {
    throw new AttachmentError('You can attach up to 8 files.')
  }
  let total = 0
  return files.map(file => {
    const name = cleanFileName(file.name)
    if (!name) throw new AttachmentError('Use a file name without slashes, up to 180 characters.')
    const packed = file.data.replace(/\s/g, '')
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(packed)) {
      throw new AttachmentError('That attachment could not be read.')
    }
    const data = Buffer.from(packed, 'base64')
    if (data.length === 0) throw new AttachmentError('That attachment is empty.')
    if (data.length > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentError('Each attachment can be at most 8 MB.')
    }
    total += data.length
    if (total > MAX_ATTACHMENT_TOTAL) {
      throw new AttachmentError('Attachments can be at most 20 MB together.')
    }
    return { name, type: safeType(file.type), data }
  })
}

export function buildRfc5322(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
  inReplyTo?:  string
  files?:      OutboundFile[]
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
  )
  if (input.inReplyTo) {
    const ref = safeHeader(input.inReplyTo)
    headers.push(`In-Reply-To: ${ref}`, `References: ${ref}`)
  }
  const files = input.files ?? []
  const body = input.text.replace(/\r?\n/g, '\r\n')
  if (files.length === 0) {
    headers.push(
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
    )
    return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body}`, 'utf8')
  }
  const boundary = `twork_${uuidv7().replace(/-/g, '')}`
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ]
  for (const file of files) {
    const name = file.name.replace(/["\r\n]/g, '')
    const b64 = file.data.toString('base64').replace(/(.{76})/g, '$1\r\n')
    parts.push(
      `--${boundary}`,
      `Content-Type: ${file.type}; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      'Content-Transfer-Encoding: base64',
      '',
      b64,
    )
  }
  parts.push(`--${boundary}--`, '')
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`, 'utf8')
}

export function outboundConfigured(): boolean {
  return Boolean(process.env['RESEND_API_KEY'])
}

export async function deliverMail(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
  files?:      OutboundFile[]
}): Promise<void> {
  if (!process.env['RESEND_API_KEY']) throw new Error('RESEND_API_KEY is not set')
  return deliverResend(input)
}

async function deliverResend(input: {
  fromName:    string
  fromAddress: string
  to:          string
  cc:          string[]
  bcc:         string[]
  subject:     string
  text:        string
  files?:      OutboundFile[]
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
      ...((input.files ?? []).length > 0
        ? {
            attachments: (input.files ?? []).map(file => ({
              filename:     file.name,
              content:      file.data.toString('base64'),
              content_type: file.type,
            })),
          }
        : {}),
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`mail provider rejected the message (${res.status}): ${detail.slice(0, 300)}`)
  }
}

function safeType(type: string): string {
  const clean = type.trim().toLowerCase()
  if (/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(clean)) return clean
  return 'application/octet-stream'
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
