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

function loadBlendMode (mode) {
  return loadImage(`./resources/blends/${mode}.png`)
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
        types[tile.terrain] = true
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
  uniform sampler2D otherTexture;
  uniform sampler2D blendMode;
  varying vec2 v_coord;

  void main () {
    vec4 basePx = texture2D(texture, v_coord);
    vec4 otherPx = texture2D(otherTexture, v_coord);
    vec4 maskPx = texture2D(blendMode, v_coord);
    gl_FragColor = mix(basePx, otherPx, 1.0 - maskPx.a);
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

function getTile (image, offsetX, offsetY, width, height) {
  const canv = document.createElement('canvas')
  canv.width = width
  canv.height = height
  canv.getContext('2d').drawImage(image,
    offsetX, offsetY,
    width, height,
    0, 0,
    width, height)
  return canv
}

function createTiledTexture (gl, image) {
  const TILESIZE = 64
  const textures = []
  for (let y = 0; y < 512; y += TILESIZE) {
    for (let x = 0; x < 512; x += TILESIZE) {
      const texture = createTexture(gl, getTile(image, x, y, TILESIZE, TILESIZE))
      texture.wrap = gl.REPEAT
      textures.push(texture)
    }
  }
  return textures
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

    this.camera = new Camera(this.canvas)
  }

  load (terrain) {
    this.terrain = terrain

    const terrainTypes = getUniqueTerrainTypes(terrain)
    return loadTerrainTextures(terrainTypes).then((images) => {
      this.terrainImages = images
      this.terrainTextures = {}
      Object.keys(images).forEach((key) => {
        this.terrainTextures[key] = createTiledTexture(this.gl, images[key])
      })

      return loadBlendMode('icewater').then((blendMode) => {
        this.blendMode = createTiledTexture(this.gl, blendMode)
      })
    })
  }

  render () {
    const { canvas, gl } = this
    const aspect = canvas.width / canvas.height

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const pMatrix = this.camera.matrix()
    const mvMatrix = mat4.create()
    mat4.identity(mvMatrix)

    this.terrain.forEach((row, y) => {
      row.forEach((tile, x) => {
        // Move one tile to the right.
        mat4.translate(mvMatrix, mvMatrix, [1, 0, 0])

        const tileIndex = (y * row.length + x) % 64

        const blendMode = this.blendMode[tileIndex].bind(2)
        const texture = this.terrainTextures[tile.terrain][tileIndex].bind(0)
        const otherTexture = this.terrainTextures[6][tileIndex].bind(1)

        this.shader.bind()
        this.squareBuffer.bind()
        this.shader.attributes.position.pointer()
        this.shader.uniforms.texture = texture
        this.shader.uniforms.otherTexture = otherTexture
        this.shader.uniforms.blendMode = blendMode
        this.shader.uniforms.pMatrix = pMatrix
        this.shader.uniforms.mvMatrix = mvMatrix

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      })
      // Move to the first tile in the next row.
      mat4.translate(mvMatrix, mvMatrix, [-row.length, -1, 0])
    })
  }
}
