import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanFileName } from '../src/file-name.js'

test('file names stay a single segment', () => {
  assert.equal(cleanFileName('  lease.pdf '), 'lease.pdf')
  assert.equal(cleanFileName('a/b.pdf'), null)
  assert.equal(cleanFileName('..'), null)
  assert.equal(cleanFileName(''), null)
  assert.equal(cleanFileName('x'.repeat(181)), null)
})
