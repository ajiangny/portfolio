// test/colors.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rgb, lerp3 } from '../src/components/gradient/colors.js'

test('rgb normalizes 8-bit channels to 0..1', () => {
  assert.deepEqual(rgb(255, 0, 128), [1, 0, 128 / 255])
})

test('lerp3 interpolates each channel', () => {
  assert.deepEqual(lerp3([0, 0, 0], [1, 1, 1], 0), [0, 0, 0])
  assert.deepEqual(lerp3([0, 0, 0], [1, 1, 1], 1), [1, 1, 1])
  assert.deepEqual(lerp3([0, 0, 0], [1, 0.5, 0.25], 0.5), [0.5, 0.25, 0.125])
})
