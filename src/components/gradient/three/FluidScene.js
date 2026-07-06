// src/components/gradient/three/FluidScene.js
// Owns the THREE.WebGLRenderer, the Simulation, and the composite pass that
// draws the final picture. `supported` is false when WebGL2 or float color
// buffers are unavailable — the caller then leaves the CSS cream fallback.
import { WebGLRenderer, LinearFilter, Vector3 } from 'three'
import { Simulation } from './Simulation'
import { ShaderPass } from './ShaderPass'
import { VERT, COMPOSITE } from './shaders'
import { SIM, GRADIENT } from '../gradientConfig'

export class FluidScene {
  constructor(canvas) {
    this.supported = false
    this.renderer = null
    this.simRes = SIM.RES

    let renderer
    try {
      renderer = new WebGLRenderer({
        canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
      })
    } catch (e) {
      console.error('[FluidScene]', e)
      return
    }
    if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return }
    const floatRT = renderer.extensions.get('EXT_color_buffer_float')
      || renderer.extensions.get('EXT_color_buffer_half_float')
    if (!floatRT) { renderer.dispose(); return }

    this.renderer = renderer
    this.sim = new Simulation(renderer, LinearFilter) // half-float linear is core in WebGL2
    this.composite = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: COMPOSITE,
      uniforms: {
        uDye: { value: null }, uVelocity: { value: null },
        uBase0: { value: new Vector3() }, uBase1: { value: new Vector3() },
        uInk: { value: new Vector3() },
        uDyeIntensity: { value: SIM.DYE_INTENSITY },
        uDyeMax: { value: SIM.DYE_MAX },
        uRefraction: { value: SIM.REFRACTION },
        uTime: { value: 0 },
        uGrain: { value: GRADIENT.GRAIN },
      },
    })
    this.supported = true
  }

  setSimRes(res) { this.simRes = res }

  resize(w, h, dpr) {
    if (!this.supported) return
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    const sh = this.simRes
    const sw = Math.max(2, Math.round(this.simRes * aspect))
    this.sim.resize(sw, sh)
  }

  _applyPalette(palette) {
    const u = this.composite.uniforms
    u.uDye.value = this.sim.dye.read.texture
    u.uVelocity.value = this.sim.velocity.read.texture
    u.uBase0.value.set(palette.base0[0], palette.base0[1], palette.base0[2])
    u.uBase1.value.set(palette.base1[0], palette.base1[1], palette.base1[2])
    u.uInk.value.set(palette.ink[0], palette.ink[1], palette.ink[2])
  }

  update({ pointer, ambient, time, iters, palette }) {
    if (!this.supported) return
    this.sim.step({ pointer, ambient, time, iters, energy: palette.energy ?? 1 })
    this._applyPalette(palette)
    this.composite.uniforms.uTime.value = time // re-seeds the grain each frame
    this.composite.render(null)
  }

  // Run the sim forward (no compositing) so the first painted frame is already
  // a developed liquid — without this the field starts empty and the first few
  // seconds look like isolated blobs while the dye builds + folds. One composite
  // at the end paints the warmed-up state.
  //
  // Batched async: runs BATCH steps per animation frame so the main thread
  // can paint the loading screen's logo animation between batches. Uses fewer
  // Jacobi iterations than runtime — behind the veil the quality difference
  // is invisible, but the GPU headroom lets the CSS/JS animations stay smooth.
  prewarm({ steps, iters, palette }) {
    if (!this.supported) return Promise.resolve()
    const BATCH = 8                     // ~8 steps × ~17 draws ≈ 136 GPU calls/frame → smooth 60fps
    const warmIters = Math.max(4, Math.ceil(iters / 2))  // half the runtime Jacobi
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, down: false }
    let done = 0

    return new Promise((resolve) => {
      const tick = () => {
        const end = Math.min(done + BATCH, steps)
        for (let i = done; i < end; i++) {
          this.sim.step({ pointer, ambient: true, time: i / 30, iters: warmIters, energy: palette.energy ?? 1 })
        }
        done = end
        if (done < steps) {
          requestAnimationFrame(tick)
        } else {
          // Final composite with full-quality Jacobi on the last step so the
          // revealed frame looks identical to a runtime frame.
          this._applyPalette(palette)
          this.composite.render(null)
          resolve()
        }
      }
      // Start immediately — the first batch is light enough not to block.
      tick()
    })
  }

  // Reduced-motion: one static frame, no sim step (dye is empty → base only).
  // uTime stays 0 → a single, non-shimmering grain pattern.
  renderStatic(palette) {
    if (!this.supported) return
    this._applyPalette(palette)
    this.composite.render(null)
  }

  dispose() {
    if (!this.renderer) return
    this.sim.dispose()
    this.composite.dispose()
    this.renderer.dispose()
    this.renderer = null
    this.supported = false
  }
}
