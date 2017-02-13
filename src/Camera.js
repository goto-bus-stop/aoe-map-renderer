const mat4 = require('gl-mat4')

module.exports = class Camera {
  constructor (canvas) {
    this.canvas = canvas
    this.position = [0, 0, 1]
    this.zoom = 56
  }

  transform () {
    const matrix = mat4.create()
    mat4.identity(matrix)
    mat4.translate(matrix, matrix, this.position)
    return matrix
  }

  matrix () {
    const camera = mat4.create()
    const w = this.canvas.width / 2
    const h = this.canvas.height / 2
    mat4.ortho(camera, -w, w, -h, h, -1000, 2000)
    mat4.rotateX(camera, camera, -Math.PI / 4)
    mat4.rotateZ(camera, camera, -Math.PI / 4)
    mat4.scale(camera, camera, [this.zoom, this.zoom, this.zoom])

    return camera
  }
}
