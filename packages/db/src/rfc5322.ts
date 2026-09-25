import PostalMime from 'postal-mime'
import type { Address, Mailbox } from 'postal-mime'

export interface ParsedAttachment {
  name: string
  type: string
  size: number
}

export interface ParsedMessage {
  messageId:   string | null
  inReplyTo:   string | null
  subject:     string | null
  from:        string | null
  to:          string[]
  cc:          string[]
  bcc:         string[]
  date:        string | null
  text:        string | null
  attachments: ParsedAttachment[]
}

export interface MessageFile {
  name: string
  type: string
  data: Buffer
}

export async function readMessageFiles(raw: Buffer): Promise<MessageFile[]> {
  const email = await PostalMime.parse(raw)
  return filesOf(email)
}

export async function parseRfc5322(raw: Buffer): Promise<ParsedMessage> {
  const email = await PostalMime.parse(raw)
  const files = filesOf(email)
  const text = email.text?.trim()
    || (email.html ? htmlToText(email.html) : '')
  return {
    messageId: email.messageId ?? null,
    inReplyTo: email.inReplyTo ?? null,
    subject:   email.subject ?? null,
    from:      firstAddress(email.from),
    to:        addressList(email.to),
    cc:        addressList(email.cc),
    bcc:       addressList(email.bcc),
    date:      email.date ?? null,
    text:      text.length > 0 ? text : null,
    attachments: files.map(file => ({ name: file.name, type: file.type, size: file.data.length })),
  }
}

function filesOf(email: Awaited<ReturnType<typeof PostalMime.parse>>): MessageFile[] {
  const files: MessageFile[] = []
  for (const file of email.attachments) {
    if (file.disposition !== 'attachment' && !file.filename) continue
    const data = fileBytes(file.content, file.encoding)
    if (data.length === 0) continue
    files.push({
      name: file.filename?.trim() || 'file',
      type: file.mimeType || 'application/octet-stream',
      data,
    })
  }
  return files
}

function fileBytes(content: ArrayBuffer | Uint8Array | string, encoding?: string): Buffer {
  if (typeof content === 'string') return Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf8')
  if (content instanceof ArrayBuffer) return Buffer.from(new Uint8Array(content))
  return Buffer.from(content)
}

function firstAddress(value: Address | undefined): string | null {
  const list = value ? addressList([value]) : []
  return list[0] ?? null
}

function addressList(values: Address[] | undefined): string[] {
  if (!values) return []
  const out: string[] = []
  for (const value of values) {
    if (value.group) {
      for (const box of value.group) out.push(formatMailbox(box))
    } else if (value.address) {
      out.push(formatMailbox(value))
    }
  }
  return out.filter(v => v.length > 0)
}

function formatMailbox(box: Mailbox): string {
  if (box.name && box.address) return `${box.name} <${box.address}>`
  return box.address || box.name
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
