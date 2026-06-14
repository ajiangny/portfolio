/**
 * glRenderer.js — Minimal WebGL1 renderer for one fullscreen-quad shader.
 *
 * Framework-agnostic. createGradientRenderer(canvas) returns null-safe API:
 *   { supported, resize(cssW, cssH, dpr), setUniforms(obj), render(), dispose() }
 * setUniforms accepts a flat map keyed by uniform name; values may be
 * number, [x,y], or [r,g,b]. Unknown/missing uniforms are skipped.
 */
import { VERT_SRC, FRAG_SRC } from './shaders'

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error('Shader compile failed: ' + log)
  }
  return sh
}

export function createGradientRenderer(canvas) {
  const gl =
    canvas.getContext('webgl', { antialias: false, depth: false, alpha: false }) ||
    canvas.getContext('experimental-webgl')

  if (!gl) return { supported: false, resize() {}, setUniforms() {}, render() {}, dispose() {} }

  let program
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(program))
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
  } catch (err) {
    console.error('[gradient]', err)
    return { supported: false, resize() {}, setUniforms() {}, render() {}, dispose() {} }
  }

  gl.useProgram(program)

  // Fullscreen quad (two triangles)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const locCache = {}
  function loc(name) {
    if (!(name in locCache)) locCache[name] = gl.getUniformLocation(program, name)
    return locCache[name]
  }

  return {
    supported: true,
    resize(cssW, cssH, dpr) {
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(cssH * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    setUniforms(obj) {
      for (const name in obj) {
        const l = loc(name)
        if (l === null) continue
        const v = obj[name]
        if (typeof v === 'number') gl.uniform1f(l, v)
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1])
        else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2])
      }
    },
    render() {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    dispose() {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      // Intentionally do NOT call WEBGL_lose_context.loseContext() here.
      // FluidGradient lives at the app root and only "unmounts" during React
      // StrictMode's dev double-invoke; a canvas hands back the SAME context on
      // the next getContext(), so losing it would make the remount compile on a
      // dead context (fails with a null infolog → silent cream fallback).
      // Dropping the program/buffer is enough; the context is reused cleanly.
    },
  }
}
