// src/components/gradient/three/ShaderPass.js
// One fullscreen-quad fragment program rendered into a target (or to screen).
// The vertex shader writes clip space directly, so the camera matrices are
// unused — a bare Camera satisfies renderer.render()'s signature.
import {
  RawShaderMaterial, PlaneGeometry, Mesh, Scene, Camera,
} from 'three'

const CAMERA = new Camera()

export class ShaderPass {
  constructor(renderer, { vertexShader, fragmentShader, uniforms }) {
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

  get uniforms() { return this.material.uniforms }

  render(target = null) {
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, CAMERA)
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
