/**
 * fluidSim.js — Velocity + dye fluid sim on a shared WebGL1 context.
 *
 * createFluidSim(gl, res) returns a null-safe API:
 *   { supported, linearFiltering, step(pointer, dyeColor),
 *     velocityTexture, dyeTexture, resize(res), dispose() }
 * `pointer` = { x, y, dx, dy, down, iters } in 0..1 uv (origin bottom-left)
 * with per-frame deltas; `dyeColor` is the [r,g,b] ink injected at the pointer.
 * Unsupported (no renderable float textures) → supported=false and the caller
 * falls back to the plain display gradient.
 */
import {
  SIM_VERT, ADVECT_FRAG, SPLAT_FRAG, CURL_FRAG, VORTICITY_FRAG,
  DIVERGENCE_FRAG, JACOBI_FRAG, GRADIENT_SUBTRACT_FRAG,
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

function makeTex(gl, res, type, filter) {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
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
function makeTarget(gl, res, type, filter) {
  const tex = makeTex(gl, res, type, filter)
  const fbo = makeFbo(gl, tex)
  return { tex, fbo }
}
function makeDouble(gl, res, type, filter) {
  let a = makeTarget(gl, res, type, filter), b = makeTarget(gl, res, type, filter)
  return { get read() { return a }, get write() { return b }, swap() { const t = a; a = b; b = t } }
}

// Pick a renderable float type + a safe filter. Many GPUs can render to float
// textures but not LINEAR-filter them (no *_texture_*_linear); sampling such a
// texture with LINEAR makes it incomplete and every read returns 0. So fall
// back to NEAREST when linear filtering isn't supported for the chosen type.
function pickFloatType(gl) {
  const half = gl.getExtension('OES_texture_half_float')
  const halfLinear = gl.getExtension('OES_texture_half_float_linear')
  gl.getExtension('EXT_color_buffer_half_float')
  const flt = gl.getExtension('OES_texture_float')
  const floatLinear = gl.getExtension('OES_texture_float_linear')
  gl.getExtension('WEBGL_color_buffer_float')
  const candidates = []
  if (half) candidates.push({ type: half.HALF_FLOAT_OES, linear: !!halfLinear })
  if (flt) candidates.push({ type: gl.FLOAT, linear: !!floatLinear })
  for (const c of candidates) {
    const filter = c.linear ? gl.LINEAR : gl.NEAREST
    const tex = makeTex(gl, 4, c.type, filter)
    const fbo = makeFbo(gl, tex)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.deleteFramebuffer(fbo); gl.deleteTexture(tex)
    if (ok) return { type: c.type, filter }
  }
  return null
}

const NOOP = {
  supported: false, linearFiltering: false, step() {},
  get velocityTexture() { return null }, get dyeTexture() { return null },
  resize() {}, dispose() {},
}

export function createFluidSim(gl, res) {
  if (!gl) return NOOP
  const picked = pickFloatType(gl)
  if (!picked) return NOOP
  const { type, filter } = picked
  const linearFiltering = filter === gl.LINEAR

  let progs
  try {
    progs = {
      advect: makeProgram(gl, ADVECT_FRAG),
      splat: makeProgram(gl, SPLAT_FRAG),
      curl: makeProgram(gl, CURL_FRAG),
      vorticity: makeProgram(gl, VORTICITY_FRAG),
      divergence: makeProgram(gl, DIVERGENCE_FRAG),
      jacobi: makeProgram(gl, JACOBI_FRAG),
      gradient: makeProgram(gl, GRADIENT_SUBTRACT_FRAG),
    }
  } catch (err) { console.error('[fluidSim]', err); return NOOP }

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  let R = res
  let velocity = makeDouble(gl, R, type, filter)
  let dye = makeDouble(gl, R, type, filter)
  let pressure = makeDouble(gl, R, type, filter)
  let divergence = makeTarget(gl, R, type, filter)
  let curlT = makeTarget(gl, R, type, filter)
  let texel = [1 / R, 1 / R]

  // Float textures allocated with null data have undefined contents; clear to 0.
  function clearTargets() {
    const fbos = [
      velocity.read.fbo, velocity.write.fbo, dye.read.fbo, dye.write.fbo,
      pressure.read.fbo, pressure.write.fbo, divergence.fbo, curlT.fbo,
    ]
    for (const f of fbos) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.viewport(0, 0, R, R)
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }
  clearTargets()

  // Uniform-location cache keyed by program IDENTITY then name. (A plain
  // `p + '|' + name` key stringifies every WebGLProgram to "[object
  // WebGLProgram]", collapsing all programs onto one key — so each program but
  // the first got another program's location and WebGL rejected the upload,
  // silently leaving uTexel at 0 and killing advection/pressure/vorticity.)
  const locs = new Map() // program -> (name -> WebGLUniformLocation)
  function u(p, name) {
    let m = locs.get(p)
    if (!m) { m = new Map(); locs.set(p, m) }
    if (!m.has(name)) m.set(name, gl.getUniformLocation(p, name))
    return m.get(name)
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

  // additive gaussian splat of `value` (vec3) into a double-buffered field
  function splat(field, px, py, value) {
    gl.useProgram(progs.splat); bindQuad(progs.splat)
    tex(0, field.read.tex); gl.uniform1i(u(progs.splat, 'uTarget'), 0)
    gl.uniform2f(u(progs.splat, 'uPoint'), px, py)
    gl.uniform3f(u(progs.splat, 'uValue'), value[0], value[1], value[2])
    gl.uniform1f(u(progs.splat, 'uRadius'), SIM.SPLAT_RADIUS)
    gl.uniform1f(u(progs.splat, 'uAspect'), 1.0)
    blit(field.write); field.swap()
  }

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
    linearFiltering,
    get velocityTexture() { return velocity.read.tex },
    get dyeTexture() { return dye.read.tex },
    resize(newRes) {
      if (newRes === R) return
      this.dispose(true)
      R = newRes
      velocity = makeDouble(gl, R, type, filter)
      dye = makeDouble(gl, R, type, filter)
      pressure = makeDouble(gl, R, type, filter)
      divergence = makeTarget(gl, R, type, filter)
      curlT = makeTarget(gl, R, type, filter)
      texel = [1 / R, 1 / R]
      clearTargets()
    },
    step(pointer, dyeColor) {
      // inject velocity + ink from pointer motion
      if (pointer && pointer.down) {
        const cap = SIM.FORCE_CLAMP
        const dx = Math.max(-cap, Math.min(cap, pointer.dx))
        const dy = Math.max(-cap, Math.min(cap, pointer.dy))
        splat(velocity, pointer.x, pointer.y, [dx * SIM.FORCE * R, dy * SIM.FORCE * R, 0])
        splat(dye, pointer.x, pointer.y, dyeColor)
      }

      // vorticity confinement (swirl)
      gl.useProgram(progs.curl); bindQuad(progs.curl)
      tex(0, velocity.read.tex); gl.uniform1i(u(progs.curl, 'uVelocity'), 0)
      gl.uniform2f(u(progs.curl, 'uTexel'), texel[0], texel[1])
      blit(curlT)

      gl.useProgram(progs.vorticity); bindQuad(progs.vorticity)
      tex(0, velocity.read.tex); gl.uniform1i(u(progs.vorticity, 'uVelocity'), 0)
      tex(1, curlT.tex);         gl.uniform1i(u(progs.vorticity, 'uCurl'), 1)
      gl.uniform2f(u(progs.vorticity, 'uTexel'), texel[0], texel[1])
      gl.uniform1f(u(progs.vorticity, 'uCurlStrength'), SIM.CURL)
      gl.uniform1f(u(progs.vorticity, 'uDt'), SIM.DT)
      blit(velocity.write); velocity.swap()

      // divergence
      gl.useProgram(progs.divergence); bindQuad(progs.divergence)
      tex(0, velocity.read.tex); gl.uniform1i(u(progs.divergence, 'uVelocity'), 0)
      gl.uniform2f(u(progs.divergence, 'uTexel'), texel[0], texel[1])
      blit(divergence)

      // pressure solve
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

      // advect velocity, then the dye it carries
      advect(velocity, velocity, SIM.VEL_DISSIPATION)
      advect(dye, dye, SIM.DYE_DISSIPATION)
    },
    dispose(keepProgs) {
      for (const d of [velocity, dye, pressure]) {
        gl.deleteTexture(d.read.tex); gl.deleteFramebuffer(d.read.fbo)
        gl.deleteTexture(d.write.tex); gl.deleteFramebuffer(d.write.fbo)
      }
      gl.deleteTexture(divergence.tex); gl.deleteFramebuffer(divergence.fbo)
      gl.deleteTexture(curlT.tex); gl.deleteFramebuffer(curlT.fbo)
      if (keepProgs) return
      gl.deleteBuffer(quad)
      for (const p of Object.values(progs)) gl.deleteProgram(p)
    },
  }
}
