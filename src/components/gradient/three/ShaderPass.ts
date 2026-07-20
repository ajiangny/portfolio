// src/components/gradient/three/ShaderPass.ts
// One fullscreen-quad fragment program rendered into a target (or to screen).
// The vertex shader writes clip space directly, so the camera matrices are
// unused — a bare Camera satisfies renderer.render()'s signature.
import {
  RawShaderMaterial, PlaneGeometry, Mesh, Scene, Camera,
  type WebGLRenderer, type WebGLRenderTarget, type IUniform,
} from 'three'

const CAMERA = new Camera()

export interface ShaderPassOptions {
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, IUniform>
}

export class ShaderPass {
  renderer: WebGLRenderer
  material: RawShaderMaterial
  geometry: PlaneGeometry
  mesh: Mesh
  scene: Scene

  constructor(renderer: WebGLRenderer, { vertexShader, fragmentShader, uniforms }: ShaderPassOptions) {
    this.renderer = renderer
    this.material = new RawShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      depthTest: false, depthWrite: false,
    })
    this.geometry = new PlaneGeometry(2, 2)
    this.mesh = new Mesh(this.geometry, this.material)
    this.scene = new Scene()
    this.scene.add(this.mesh)
  }

  get uniforms(): Record<string, IUniform> { return this.material.uniforms }

  render(target: WebGLRenderTarget | null = null) {
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, CAMERA)
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
