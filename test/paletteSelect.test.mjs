// test/paletteSelect.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectPalette } from '../src/components/gradient/paletteSelect.js'

const ORDER = ['a', 'b']
const PALETTES = {
  a: { base: [[0, 0, 0], [0, 0, 0]], ink: [0, 0, 0] },
  b: { base: [[1, 1, 1], [1, 1, 1]], ink: [1, 1, 1] },
}
const rect = (top, height) => ({ top, bottom: top + height, height })

test('picks the section holding the centre, no crossfade before seamFade', () => {
  const rects = [rect(0, 100), rect(100, 100)]
  const p = selectPalette(rects, 50, ORDER, PALETTES, 0.85)
  assert.deepEqual(p.base0, [0, 0, 0])
  assert.deepEqual(p.ink, [0, 0, 0])
})

test('crossfades toward the next section past seamFade', () => {
  const rects = [rect(0, 100), rect(100, 100)]
  const p = selectPalette(rects, 90, ORDER, PALETTES, 0.8)
  assert.deepEqual(p.ink, [0.5, 0.5, 0.5])
})

test('clamps to last section when centre is past everything', () => {
  const rects = [rect(-200, 100), rect(-100, 100)]
  const p = selectPalette(rects, 50, ORDER, PALETTES, 0.85)
  assert.deepEqual(p.ink, [1, 1, 1])
})

test('skips missing rects (null elements)', () => {
  const rects = [null, rect(0, 100)]
  const p = selectPalette(rects, 50, ORDER, PALETTES, 0.85)
  assert.deepEqual(p.ink, [1, 1, 1])
})
