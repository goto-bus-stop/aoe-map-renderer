const createBuffer = require('gl-buffer')
const createShader = require('gl-shader')
const createTexture = require('gl-texture2d')
const mat4 = require('gl-mat4')
const loadImage = require('pify')(require('load-img'))
const textureNames = require('./textureNames')
const Camera = require('./Camera')

const DEFAULT_TEXTURE = 'g_bla'

/**
 * Load a texture by terrain ID.
 *
 * @return Promise<Image>
 */
function loadTerrainTexture (type) {
  return loadImage(`./resources/terrains/${textureNames[type] || DEFAULT_TEXTURE}_00_color.png`)
}

/**
 * Load texture images for a list of terrain type IDs.
 *
 * @return Promise For an object with `[type]: texture` pairs.
 */
function loadTerrainTextures (terrainTypes) {
  return Promise.all(terrainTypes.map(loadTerrainTexture))
    .then((list) => list.reduce((map, texture, i) => {
      map[terrainTypes[i]] = texture
      return map
    }, {}))
}

function getUniqueTerrainTypes (terrain) {
  return Object.keys(
    terrain.reduce((types, rows) => {
      rows.forEach((tile) => {
        types[tile.type] = true
      })
      return types
    }, {}))
}

const tileVertexShader = `
  precision highp float;

  uniform mat4 mvMatrix;
  uniform mat4 pMatrix;

  attribute vec3 position;
  varying vec2 v_coord;

  void main () {
    gl_Position = pMatrix * mvMatrix * vec4(position, 1.0);
    v_coord = position.xy;
  }
`

const tileFragmentShader = `
  precision highp float;

  uniform sampler2D texture;
  varying vec2 v_coord;

  void main () {
    gl_FragColor = texture2D(texture, v_coord);
  }
`

const squareVertices = [
   1,  1, 0,
  -1,  1, 0,
   1, -1, 0,
  -1, -1, 0
]

function makeSquareBuffer (gl) {
  return createBuffer(gl, squareVertices)
}

module.exports = class MapRenderer {
  constructor (canvas) {
    this.canvas = canvas

    const gl = canvas.getContext('webgl')
    // const gl = WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl'), undefined,
    //   (fn, args) => console.log(`gl.${fn}(`, ...args, ')'))
    this.gl = gl

    this.shader = createShader(gl, tileVertexShader, tileFragmentShader)
    this.shader.attributes.position.location = 0
    this.squareBuffer = makeSquareBuffer(gl)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  load (terrain) {
    this.terrain = terrain

    const terrainTypes = getUniqueTerrainTypes(terrain)
    return loadTerrainTextures(terrainTypes).then((images) => {
      this.terrainImages = images
      this.terrainTextures = {}
      Object.keys(images).forEach((key) => {
        this.terrainTextures[key] = createTexture(this.gl, images[key])
        this.terrainTextures[key].wrap = this.gl.REPEAT
      })
    })
  }

  render () {
    const { canvas, gl } = this
    const aspect = canvas.width / canvas.height

    gl.viewport(0, 0, canvas.width, canvas.height)

    const pMatrix = mat4.create()
    const mvMatrix = mat4.create()
    mat4.perspective(pMatrix, 45, aspect, 0, 100)
    mat4.identity(mvMatrix)
    mat4.translate(mvMatrix, mvMatrix, [0, 0, -7])

    this.terrain.forEach((row, y) => {
      row.forEach((tile, x) => {
        // Move one tile to the right.
        mat4.translate(mvMatrix, mvMatrix, [1, 0, 0])

        const texture = this.terrainTextures[tile.type].bind()

        this.shader.bind()
        this.squareBuffer.bind()
        this.shader.attributes.position.pointer()
        this.shader.uniforms.texture = texture
        this.shader.uniforms.pMatrix = pMatrix
        this.shader.uniforms.mvMatrix = mvMatrix

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      })
      // Move to the first tile in the next row.
      mat4.translate(mvMatrix, mvMatrix, [-row.length, -1, 0])
    })
  }
}
