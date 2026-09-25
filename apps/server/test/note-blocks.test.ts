import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeNote, encodeNote, normalizeBlocks } from '../src/note-blocks.js'

test('a note keeps text, heading, and list blocks', () => {
  const blocks = normalizeBlocks([
    { type: 'heading', text: 'Hello' },
    { type: 'text', text: 'A quiet page' },
    { type: 'list', text: 'One\nTwo' },
  ])
  const roundTrip = decodeNote(encodeNote(blocks))
  assert.deepEqual(roundTrip, blocks)
})

test('an empty note is one blank text block', () => {
  assert.deepEqual(normalizeBlocks([]), [{ type: 'text', text: '' }])
})
