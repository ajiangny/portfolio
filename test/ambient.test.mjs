// test/ambient.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ambientSplats } from '../src/components/gradient/ambient.js'

test('returns points inside the field with finite velocity', () => {
  for (const t of [0, 1.5, 42]) {
    const pts = ambientSplats(t)
    assert.ok(pts.length >= 1)
    for (const p of pts) {
      assert.ok(p.x >= 0 && p.x <= 1, `x in range: ${p.x}`)
      assert.ok(p.y >= 0 && p.y <= 1, `y in range: ${p.y}`)
      assert.ok(Number.isFinite(p.dx) && Number.isFinite(p.dy))
    }
  }
})

test('is deterministic for a given time', () => {
  assert.deepEqual(ambientSplats(3.3), ambientSplats(3.3))
})

test('moves over time', () => {
  assert.notDeepEqual(ambientSplats(0), ambientSplats(5))
})
