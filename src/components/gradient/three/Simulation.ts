// src/components/gradient/three/Simulation.ts
// Stable-fluids velocity + dye sim on half-float render targets. Per step:
// inject force/dye (cursor + ambient) → divergence → Jacobi pressure →
// subtract gradient (divergence-free) → advect velocity → advect dye.
import {
  WebGLRenderTarget, HalfFloatType, RGBAFormat, ClampToEdgeWrapping, Vector2, Vector3,
  type WebGLRenderer, type MagnificationTextureFilter,
} from 'three'
import { ShaderPass } from './ShaderPass'
import { VERT, SPLAT, ADVECT, DIVERGENCE, JACOBI, GRADIENT_SUBTRACT } from './shaders'
import { SIM } from '../gradientConfig'
import { ambientSplats } from '../ambient'

export interface PointerState {
  x: number
  y: number
  dx: number
  dy: number
  down: boolean
}

export interface StepOptions {
  pointer?: PointerState | null
  ambient?: boolean
  time: number
  iters: number
  energy?: number
}

interface DoubleFBO {
  readonly read: WebGLRenderTarget
  readonly write: WebGLRenderTarget
  swap(): void
  dispose(): void
}

const clamp = (v: number, c: number) => Math.max(-c, Math.min(c, v))

function makeRT(w: number, h: number, filter: MagnificationTextureFilter) {
  return new WebGLRenderTarget(w, h, {
    type: HalfFloatType, format: RGBAFormat,
    minFilter: filter, magFilter: filter,
    depthBuffer: false, stencilBuffer: false,
    wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping,
  })
}

function makeDouble(w: number, h: number, filter: MagnificationTextureFilter): DoubleFBO {
  let a = makeRT(w, h, filter)
  let b = makeRT(w, h, filter)
  return {
    get read() { return a },
    get write() { return b },
    swap() { const t = a; a = b; b = t },
    dispose() { a.dispose(); b.dispose() },
  }
}

export class Simulation {
  renderer: WebGLRenderer
  filter: MagnificationTextureFilter
  w: number
  h: number
  texel: Vector2
  velocity: DoubleFBO
  dye: DoubleFBO
  pressure: DoubleFBO
  divergence: WebGLRenderTarget
  splatPass: ShaderPass
  advectPass: ShaderPass
  divPass: ShaderPass
  jacobiPass: ShaderPass
  gradPass: ShaderPass

  constructor(renderer: WebGLRenderer, filter: MagnificationTextureFilter) {
    this.renderer = renderer
    this.filter = filter
    this.w = 2
    this.h = 2
    this.texel = new Vector2(0.5, 0.5)

    this.velocity = makeDouble(2, 2, filter)
    this.dye = makeDouble(2, 2, filter)
    this.pressure = makeDouble(2, 2, filter)
    this.divergence = makeRT(2, 2, filter)

    this.splatPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: SPLAT,
      uniforms: {
        uTarget: { value: null }, uColor: { value: new Vector3() },
        uPoint: { value: new Vector2() }, uRadius: { value: SIM.SPLAT_RADIUS },
        uAspectRatio: { value: 1 },
      },
    })
    this.advectPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: ADVECT,
      uniforms: {
        uVelocity: { value: null }, uSource: { value: null },
        uTexelSize: { value: this.texel }, uDt: { value: SIM.DT },
        uDissipation: { value: 1 },
      },
    })
    this.divPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: DIVERGENCE,
      uniforms: { uVelocity: { value: null }, uTexelSize: { value: this.texel } },
    })
    this.jacobiPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: JACOBI,
      uniforms: {
        uPressure: { value: null }, uDivergence: { value: null },
        uTexelSize: { value: this.texel },
      },
    })
    this.gradPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: GRADIENT_SUBTRACT,
      uniforms: {
        uPressure: { value: null }, uVelocity: { value: null },
        uTexelSize: { value: this.texel },
      },
    })
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.texel.set(1 / w, 1 / h)
    this.velocity.dispose()
    this.dye.dispose()
    this.pressure.dispose()
    this.divergence.dispose()
    this.velocity = makeDouble(w, h, this.filter)
    this.dye = makeDouble(w, h, this.filter)
    this.pressure = makeDouble(w, h, this.filter)
    this.divergence = makeRT(w, h, this.filter)
  }

  splat(field: DoubleFBO, x: number, y: number, color: [number, number, number], radius: number) {
    const u = this.splatPass.uniforms
    u.uTarget.value = field.read.texture
    u.uPoint.value.set(x, y)
    u.uColor.value.set(color[0], color[1], color[2])
    u.uRadius.value = radius
    u.uAspectRatio.value = this.w / this.h
    this.splatPass.render(field.write)
    field.swap()
  }

  advect(field: DoubleFBO, dissipation: number) {
    const u = this.advectPass.uniforms
    u.uVelocity.value = this.velocity.read.texture
    u.uSource.value = field.read.texture
    u.uDissipation.value = dissipation
    this.advectPass.render(field.write)
    field.swap()
  }

  step({ pointer, ambient, time, iters, energy = 1 }: StepOptions) {
    // 1. external forces + dye
    if (pointer && pointer.down) {
      const fx = clamp(pointer.dx, SIM.FORCE_CLAMP) * SIM.CURSOR_FORCE
      const fy = clamp(pointer.dy, SIM.FORCE_CLAMP) * SIM.CURSOR_FORCE
      this.splat(this.velocity, pointer.x, pointer.y, [fx, fy, 0], SIM.SPLAT_RADIUS)
      const d = SIM.CURSOR_DENSITY
      this.splat(this.dye, pointer.x, pointer.y, [d, d, d], SIM.SPLAT_RADIUS)
    }
    if (ambient) {
      // Per-section energy scales the stir (Hero churns, others stay calm) and,
      // more gently, the emitted dye so calm sections read cleanly.
      const force = SIM.AMBIENT_FORCE * energy
      const d = SIM.AMBIENT_DENSITY * (0.35 + 0.65 * energy)
      for (const p of ambientSplats(time)) {
        this.splat(this.velocity, p.x, p.y, [p.dx * force, p.dy * force, 0], SIM.AMBIENT_RADIUS)
        this.splat(this.dye, p.x, p.y, [d, d, d], SIM.AMBIENT_RADIUS)
      }
    }

    // 2. divergence of current velocity
    this.divPass.uniforms.uVelocity.value = this.velocity.read.texture
    this.divPass.render(this.divergence)

    // 3. Jacobi pressure solve (warm-started from last frame's pressure)
    this.jacobiPass.uniforms.uDivergence.value = this.divergence.texture
    for (let i = 0; i < iters; i++) {
      this.jacobiPass.uniforms.uPressure.value = this.pressure.read.texture
      this.jacobiPass.render(this.pressure.write)
      this.pressure.swap()
    }

    // 4. subtract pressure gradient → divergence-free velocity
    this.gradPass.uniforms.uPressure.value = this.pressure.read.texture
    this.gradPass.uniforms.uVelocity.value = this.velocity.read.texture
    this.gradPass.render(this.velocity.write)
    this.velocity.swap()

    // 5. advect velocity, then dye
    this.advect(this.velocity, SIM.VEL_DISSIPATION)
    this.advect(this.dye, SIM.DYE_DISSIPATION)
  }

  dispose() {
    this.velocity.dispose()
    this.dye.dispose()
    this.pressure.dispose()
    this.divergence.dispose()
    this.splatPass.dispose()
    this.advectPass.dispose()
    this.divPass.dispose()
    this.jacobiPass.dispose()
    this.gradPass.dispose()
  }
}
