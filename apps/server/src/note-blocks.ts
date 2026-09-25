export type NoteBlockType = 'text' | 'heading' | 'list'

export interface NoteBlock {
  type: NoteBlockType
  text: string
}

const TYPES = new Set<NoteBlockType>(['text', 'heading', 'list'])

export function normalizeBlocks(blocks: NoteBlock[]): NoteBlock[] {
  const next = blocks
    .filter(block => TYPES.has(block.type))
    .map(block => ({ type: block.type, text: block.text.slice(0, 20_000) }))
    .slice(0, 200)
  return next.length > 0 ? next : [{ type: 'text', text: '' }]
}

export function encodeNote(blocks: NoteBlock[]): Buffer {
  return Buffer.from(JSON.stringify({ blocks: normalizeBlocks(blocks) }), 'utf8')
}

export function decodeNote(raw: Buffer): NoteBlock[] {
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as { blocks?: unknown }
    if (!Array.isArray(parsed.blocks)) return [{ type: 'text', text: '' }]
    const blocks: NoteBlock[] = []
    for (const item of parsed.blocks) {
      if (!item || typeof item !== 'object') continue
      const type = (item as { type?: unknown }).type
      const text = (item as { text?: unknown }).text
      if (type !== 'text' && type !== 'heading' && type !== 'list') continue
      if (typeof text !== 'string') continue
      blocks.push({ type, text })
    }
    return normalizeBlocks(blocks)
  } catch {
    return [{ type: 'text', text: raw.toString('utf8').slice(0, 20_000) }]
  }
}

export function notePlainText(title: string, blocks: NoteBlock[]): string {
  const parts = [title, ...blocks.map(block => block.text)].map(part => part.trim()).filter(Boolean)
  return parts.join('\n') || '(empty)'
}
