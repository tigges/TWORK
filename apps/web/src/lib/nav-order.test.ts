import assert from 'node:assert/strict'
import test from 'node:test'
import { moveNav, normalizeNav } from './nav-order.js'

const defaults = ['mail', 'contacts', 'files', 'notes', 'calendar', 'chat']

test('a saved order drops unknown ids and keeps missing ones', () => {
  assert.deepEqual(
    normalizeNav(['chat', 'nope', 'mail', 'mail'], defaults),
    ['chat', 'mail', 'contacts', 'files', 'notes', 'calendar'],
  )
})

test('an empty save is the default order', () => {
  assert.deepEqual(normalizeNav(null, defaults), defaults)
})

test('move swaps one step and ignores the ends', () => {
  assert.deepEqual(moveNav(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a'])
  assert.deepEqual(moveNav(['a', 'b', 'c'], 0, 0), ['a', 'b', 'c'])
  assert.deepEqual(moveNav(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
})
