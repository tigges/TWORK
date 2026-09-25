import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FAR_PX, aimOf, downResult } from './mail-hold.js'

test('a short press in the middle aims at nothing', () => {
  assert.equal(aimOf(0, 0), null)
  assert.equal(aimOf(8, -8), null)
})

test('the four arms are the dominant axis', () => {
  assert.equal(aimOf(0, -40), 'up')
  assert.equal(aimOf(-40, 4), 'left')
  assert.equal(aimOf(40, -4), 'right')
  assert.equal(aimOf(2, 30), 'down')
})

test('down past the near arrow is the further action', () => {
  assert.equal(aimOf(0, FAR_PX - 1), 'down')
  assert.equal(aimOf(0, FAR_PX), 'far')
})

test('the near release keeps the default and the far release swaps it', () => {
  assert.deepEqual(downResult('archive', 'down'), { action: 'archive', nextDefault: 'archive' })
  assert.deepEqual(downResult('archive', 'far'), { action: 'delete', nextDefault: 'delete' })
  assert.deepEqual(downResult('delete', 'down'), { action: 'delete', nextDefault: 'delete' })
  assert.deepEqual(downResult('delete', 'far'), { action: 'archive', nextDefault: 'archive' })
})
