/**
 * fluidSim.js — Low-res Stam velocity fluid sim on a shared WebGL1 context.
 *
 * createFluidSim(gl, res) returns a null-safe API:
 *   { supported, step(pointer), velocityTexture, resize(res), dispose() }
 * `pointer` = { x, y, dx, dy, down, iters } in 0..1 uv (origin bottom-left)
 * with per-frame deltas. When float/half-float render targets are unavailable,
 * supported=false and the caller falls back to the plain display gradient.
 */
import {
  SIM_VERT, ADVECT_FRAG, SPLAT_FRAG, DIVERGENCE_FRAG, JACOBI_FRAG, GRADIENT_SUBTRACT_FRAG,
} from './simShaders'
import { SIM } from './gradientConfig'

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src); gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh)
    throw new Error('sim shader compile: ' + log)
  }
  return sh
}
function makeProgram(gl, frag) {
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, SIM_VERT))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('sim link: ' + gl.getProgramInfoLog(p))
  return p
}

function makeTex(gl, res, type) {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, res, res, 0, gl.RGBA, type, null)
  return t
}
function makeFbo(gl, tex) {
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  return fbo
}
function makeTarget(gl, res, type) {
  const tex = makeTex(gl, res, type)
  const fbo = makeFbo(gl, tex)
  return { tex, fbo }
}
function makeDouble(gl, res, type) {
  let a = makeTarget(gl, res, type), b = makeTarget(gl, res, type)
  return { get read() { return a }, get write() { return b }, swap() { const t = a; a = b; b = t } }
}

function pickFloatType(gl) {
  const half = gl.getExtension('OES_texture_half_float')
  gl.getExtension('OES_texture_half_float_linear')
  gl.getExtension('EXT_color_buffer_half_float')
  const flt = gl.getExtension('OES_texture_float')
  gl.getExtension('OES_texture_float_linear')
  gl.getExtension('WEBGL_color_buffer_float')
  const candidates = []
  if (half) candidates.push(half.HALF_FLOAT_OES)
  if (flt) candidates.push(gl.FLOAT)
  for (const type of candidates) {
    const tex = makeTex(gl, 4, type)
    const fbo = makeFbo(gl, tex)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.deleteFramebuffer(fbo); gl.deleteTexture(tex)
    if (ok) return type
  }
  return null
}

const NOOP = { supported: false, step() {}, get velocityTexture() { return null }, resize() {}, dispose() {} }

export function createFluidSim(gl, res) {
  if (!gl) return NOOP
  const type = pickFloatType(gl)
  if (!type) return NOOP

  let progs
  try {
    progs = {
      advect: makeProgram(gl, ADVECT_FRAG),
      splat: makeProgram(gl, SPLAT_FRAG),
      divergence: makeProgram(gl, DIVERGENCE_FRAG),
      jacobi: makeProgram(gl, JACOBI_FRAG),
      gradient: makeProgram(gl, GRADIENT_SUBTRACT_FRAG),
    }
  } catch (err) { console.error('[fluidSim]', err); return NOOP }

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  let R = res
  let velocity = makeDouble(gl, R, type)
  let divergence = makeTarget(gl, R, type)
  let pressure = makeDouble(gl, R, type)
  let texel = [1 / R, 1 / R]

  // Float textures allocated with null data have undefined initial contents;
  // clear every target to 0 so the field starts calm (no startup garbage).
  function clearTargets() {
    for (const f of [velocity.read.fbo, velocity.write.fbo, divergence.fbo, pressure.read.fbo, pressure.write.fbo]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.viewport(0, 0, R, R)
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }
  clearTargets()

  const locs = new Map()
  function u(p, name) {
    const k = p + '|' + name
    if (!locs.has(k)) locs.set(k, gl.getUniformLocation(p, name))
    return locs.get(k)
  }
  function bindQuad(p) {
    const a = gl.getAttribLocation(p, 'aPos')
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
  }
  function blit(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    gl.viewport(0, 0, R, R)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  function tex(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t) }

  function advect(target, source, dissipation) {
    gl.useProgram(progs.advect); bindQuad(progs.advect)
    tex(0, velocity.read.tex); gl.uniform1i(u(progs.advect, 'uVelocity'), 0)
    tex(1, source.read.tex);   gl.uniform1i(u(progs.advect, 'uSource'), 1)
    gl.uniform2f(u(progs.advect, 'uTexel'), texel[0], texel[1])
    gl.uniform1f(u(progs.advect, 'uDt'), SIM.DT)
    gl.uniform1f(u(progs.advect, 'uDissipation'), dissipation)
    blit(target.write); target.swap()
  }

  return {
    supported: true,
    get velocityTexture() { return velocity.read.tex },
    resize(newRes) {
      if (newRes === R) return
      this.dispose(true)
      R = newRes
      velocity = makeDouble(gl, R, type)
      divergence = makeTarget(gl, R, type)
      pressure = makeDouble(gl, R, type)
      texel = [1 / R, 1 / R]
      clearTargets()
    },
    step(pointer) {
      // advect velocity
      advect(velocity, velocity, SIM.VEL_DISSIPATION)

      // inject force from pointer motion
      if (pointer && pointer.down) {
        gl.useProgram(progs.splat); bindQuad(progs.splat)
        tex(0, velocity.read.tex); gl.uniform1i(u(progs.splat, 'uTarget'), 0)
        gl.uniform2f(u(progs.splat, 'uPoint'), pointer.x, pointer.y)
        const cap = SIM.FORCE_CLAMP
        const dx = Math.max(-cap, Math.min(cap, pointer.dx))
        const dy = Math.max(-cap, Math.min(cap, pointer.dy))
        gl.uniform2f(u(progs.splat, 'uValue'), dx * SIM.FORCE * R, dy * SIM.FORCE * R)
        gl.uniform1f(u(progs.splat, 'uRadius'), SIM.SPLAT_RADIUS)
        gl.uniform1f(u(progs.splat, 'uAspect'), 1.0)
        blit(velocity.write); velocity.swap()
      }

      // divergence
      gl.useProgram(progs.divergence); bindQuad(progs.divergence)
      tex(0, velocity.read.tex); gl.uniform1i(u(progs.divergence, 'uVelocity'), 0)
      gl.uniform2f(u(progs.divergence, 'uTexel'), texel[0], texel[1])
      blit(divergence)

      // clear pressure, then jacobi iterations
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo)
      gl.viewport(0, 0, R, R); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(progs.jacobi); bindQuad(progs.jacobi)
      gl.uniform2f(u(progs.jacobi, 'uTexel'), texel[0], texel[1])
      tex(1, divergence.tex); gl.uniform1i(u(progs.jacobi, 'uDivergence'), 1)
      const iters = pointer && pointer.iters ? pointer.iters : SIM.JACOBI_DESKTOP
      for (let i = 0; i < iters; i++) {
        tex(0, pressure.read.tex); gl.uniform1i(u(progs.jacobi, 'uPressure'), 0)
        blit(pressure.write); pressure.swap()
      }

      // subtract pressure gradient → divergence-free velocity
      gl.useProgram(progs.gradient); bindQuad(progs.gradient)
      gl.uniform2f(u(progs.gradient, 'uTexel'), texel[0], texel[1])
      tex(0, pressure.read.tex);  gl.uniform1i(u(progs.gradient, 'uPressure'), 0)
      tex(1, velocity.read.tex);  gl.uniform1i(u(progs.gradient, 'uVelocity'), 1)
      blit(velocity.write); velocity.swap()
    },
    dispose(keepProgs) {
      for (const d of [velocity, pressure]) {
        gl.deleteTexture(d.read.tex); gl.deleteFramebuffer(d.read.fbo)
        gl.deleteTexture(d.write.tex); gl.deleteFramebuffer(d.write.fbo)
      }
      gl.deleteTexture(divergence.tex); gl.deleteFramebuffer(divergence.fbo)
      if (keepProgs) return
      gl.deleteBuffer(quad)
      for (const p of Object.values(progs)) gl.deleteProgram(p)
    },
  }
}
