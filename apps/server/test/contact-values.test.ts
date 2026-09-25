import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePhone, uniqueEmails, uniquePhones } from '../src/contact-values.js'

test('emails collapse case and repeats', () => {
  assert.deepEqual(uniqueEmails([' Ada@Example.com ', 'ada@example.com', '']), ['ada@example.com'])
})

test('phones keep a leading plus and drop spacing', () => {
  assert.equal(normalizePhone('+41 79 000 00 00'), '+41790000000')
  assert.deepEqual(uniquePhones(['079 111 22 33', '0791112233', '+41 79 111 22 33']), ['0791112233', '+41791112233'])
})
