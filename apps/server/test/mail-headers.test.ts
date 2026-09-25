import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRfc5322, readMessageFiles } from '@twork/db'
import { buildRfc5322 } from '../src/mail-send.js'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('sender copy includes Cc and Bcc only when they were set', async () => {
  const withCopies = buildRfc5322({
    fromName:    'Charles',
    fromAddress: 'charles@kell3r.com',
    to:          'daniel@tigges.ch',
    cc:          ['ada@example.com', 'grace@example.com'],
    bcc:         ['hidden@example.com'],
    subject:     'Copies',
    text:        'Hello',
  })
  const raw = withCopies.toString('utf8')
  assert.match(raw, /^Cc: ada@example.com, grace@example.com\r?$/m)
  assert.match(raw, /^Bcc: hidden@example.com\r?$/m)

  const parsed = await parseRfc5322(withCopies)
  assert.deepEqual(parsed.cc, ['ada@example.com', 'grace@example.com'])
  assert.deepEqual(parsed.bcc, ['hidden@example.com'])
  assert.equal(parsed.text, 'Hello')
  assert.deepEqual(parsed.attachments, [])

  const plain = buildRfc5322({
    fromName:    'Charles',
    fromAddress: 'charles@kell3r.com',
    to:          'daniel@tigges.ch',
    cc:          [],
    bcc:         [],
    subject:     'Plain',
    text:        'Hello',
  }).toString('utf8')
  assert.doesNotMatch(plain, /^Cc:/m)
  assert.doesNotMatch(plain, /^Bcc:/m)
})

test('an attachment rides along with the message text', async () => {
  const raw = buildRfc5322({
    fromName:    'Charles',
    fromAddress: 'charles@kell3r.com',
    to:          'daniel@tigges.ch',
    cc:          [],
    bcc:         [],
    subject:     'Shot',
    text:        'From the phone',
    files:       [{ name: 'shot.png', type: 'image/png', data: PNG }],
  })
  const parsed = await parseRfc5322(raw)
  assert.equal(parsed.text, 'From the phone')
  assert.deepEqual(parsed.attachments, [{ name: 'shot.png', type: 'image/png', size: PNG.length }])
  const [file] = await readMessageFiles(raw)
  assert.equal(file?.name, 'shot.png')
  assert.ok(file?.data.equals(PNG))
})
