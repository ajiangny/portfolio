// test/gradientConfig.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SECTION_PALETTES, SIM, GRADIENT } from '../src/components/gradient/gradientConfig.js'

const IDS = ['hero', 'about', 'projects', 'gallery', 'contact']

test('every section has a 2-stop base and an ink accent in 0..1', () => {
  for (const id of IDS) {
    const p = SECTION_PALETTES[id]
    assert.ok(p, `missing palette: ${id}`)
    assert.equal(p.base.length, 2, `${id}.base must have 2 stops`)
    for (const c of [...p.base, p.ink]) {
      assert.equal(c.length, 3)
      for (const ch of c) assert.ok(ch >= 0 && ch <= 1, `${id} channel out of range: ${ch}`)
    }
  }
})

test('SIM exposes the tuning the renderer reads', () => {
  for (const k of ['RES', 'RES_MOBILE', 'JACOBI', 'JACOBI_MOBILE', 'DT',
    'VEL_DISSIPATION', 'DYE_DISSIPATION', 'SPLAT_RADIUS', 'AMBIENT_RADIUS',
    'CURSOR_FORCE', 'AMBIENT_FORCE', 'FORCE_CLAMP', 'CURSOR_DENSITY',
    'AMBIENT_DENSITY', 'DYE_INTENSITY', 'DYE_MAX', 'REFRACTION']) {
    assert.equal(typeof SIM[k], 'number', `SIM.${k} must be a number`)
  }
})

test('GRADIENT exposes shell tuning', () => {
  for (const k of ['SEAM_FADE', 'MOBILE_SCALE', 'FRAME_MS_MOBILE']) {
    assert.equal(typeof GRADIENT[k], 'number', `GRADIENT.${k} must be a number`)
  }
})
