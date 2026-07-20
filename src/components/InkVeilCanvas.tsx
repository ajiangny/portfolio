/**
 * InkVeilCanvas.tsx — GPU ink-dissolve veil (mobile companion to the SVG
 * turbulence veils in LoadingScreen.tsx / PageTransition.tsx)
 *
 * The desktop veils dissolve via SVG feTurbulence filter chains, which mobile
 * browsers rasterize on the CPU at device DPR — every animated frame
 * re-renders the full viewport in software, which is why mobile used to fall
 * back to a plain fade. This reproduces the same alpha-threshold sweep
 * (alpha = SLOPE·noise + intercept, identical constants) as a WebGL fragment
 * shader on a transparent canvas, so the dissolve runs on the GPU at a
 * reduced buffer scale and costs about as much as one fluid-sim pass.
 *
 * Drive it with a 0→1 MotionValue: 0 = fully transparent, 1 = fully covered.
 * Renders only when `t` changes or on resize (no RAF loop). Falls back to a
 * plain opacity-fade tint div when WebGL is unavailable. The context is
 * created once per canvas and never loseContext()d — StrictMode re-runs the
 * effect on the same canvas, and a lost context would come back dead (same
 * gotcha as FluidScene.dispose).
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, type MotionValue } from 'framer-motion'

// Same sweep as the SVG veils: alpha = SLOPE·noise + intercept, intercept
// running -SLOPE-5 → +5 so coverage goes 0 → full as t goes 0 → 1.
const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
uniform vec2 uRes;      // buffer size in device px
uniform float uScale;   // buffer px per CSS px
uniform float uT;       // 0 transparent -> 1 covered
uniform vec3 uColor0;   // top tint
uniform vec3 uColor1;   // bottom tint
uniform float uSeed;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32 + uSeed);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y);
}
// 3-octave fbm, normalized to ~[0,1] — stands in for feTurbulence fractalNoise.
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.13; a *= 0.5; }
  return v / 0.875;
}
void main() {
  vec2 css = gl_FragCoord.xy / uScale;
  // Blot field ~100px features (baseFrequency 0.01 equivalent) + a finer
  // jitter that crinkles the threshold edge like the feDisplacementMap did.
  float n = fbm(css * 0.011) + (vnoise(css * 0.09) - 0.5) * 0.08;
  float alpha = clamp(40.0 * n + mix(-45.0, 5.0, uT), 0.0, 1.0);
  vec3 col = mix(uColor1, uColor0, gl_FragCoord.y / uRes.y);
  gl_FragColor = vec4(col * alpha, alpha); // premultiplied
}
`

function parseRgb(str: string): [number, number, number] {
  const m = String(str).match(/[\d.]+/g)
  if (m && m.length >= 3) return [+m[0] / 255, +m[1] / 255, +m[2] / 255]
  return [27 / 255, 58 / 255, 140 / 255] // --color-cobalt fallback (var() strings)
}

type Uniforms = Record<string, WebGLUniformLocation | null>
interface GlState { gl: WebGLRenderingContext; uni: Uniforms }

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
}

function initGl(canvas: HTMLCanvasElement): GlState | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
  const uni: Uniforms = {}
  for (const name of ['uRes', 'uScale', 'uT', 'uColor0', 'uColor1', 'uSeed'])
    uni[name] = gl.getUniformLocation(prog, name)
  return { gl, uni }
}

export interface InkVeilCanvasProps {
  t: MotionValue<number>
  colorTop: string
  colorBottom: string
  seed?: number
  style?: CSSProperties
}

export default function InkVeilCanvas({ t, colorTop, colorBottom, seed = 7, style }: InkVeilCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GlState | null>(null)
  const [unsupported, setUnsupported] = useState(false)

  // Layout effect so the first frame is drawn before paint — LoadingScreen
  // mounts this at t=1 and the page behind must never flash through.
  useLayoutEffect(() => {
    if (unsupported) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (!stateRef.current) {
      stateRef.current = initGl(canvas)
      if (!stateRef.current) {
        setUnsupported(true)
        return
      }
    }
    const { gl, uni } = stateRef.current
    const c0 = parseRgb(colorTop)
    const c1 = parseRgb(colorBottom)
    gl.uniform3f(uni.uColor0, c0[0], c0[1], c0[2])
    gl.uniform3f(uni.uColor1, c1[0], c1[1], c1[2])
    gl.uniform1f(uni.uSeed, seed)

    const draw = (v: number) => {
      gl.uniform1f(uni.uT, v)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    // Blots are soft — a reduced buffer upscaled by the compositor is
    // indistinguishable and keeps the fragment cost low (same idea as the
    // fluid gradient's MOBILE_SCALE).
    const resize = () => {
      const scale = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2) * 0.5)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uni.uRes, canvas.width, canvas.height)
      gl.uniform1f(uni.uScale, scale)
      draw(t.get())
    }
    resize()
    window.addEventListener('resize', resize)
    const unsub = t.on('change', draw)
    return () => {
      window.removeEventListener('resize', resize)
      unsub()
    }
  }, [t, colorTop, colorBottom, seed, unsupported])

  if (unsupported) {
    // No WebGL → the old mobile behaviour: plain opacity-fade tint.
    return (
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to bottom, ${colorTop}, ${colorBottom})`,
          opacity: t,
          ...style,
        }}
      />
    )
  }
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
    />
  )
}
