const loadImage = require('pify')(require('load-img'))
const textureNames = require('./textureNames')

const TILE_SIZE = 32

/**
 * Load a texture by terrain ID.
 *
 * @return Promise<Image>
 */
function loadTerrainTexture (type) {
  return loadImage(`./resources/terrains/${textureNames[type]}_00_color.png`)
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

module.exports = class MapRenderer {
  constructor (canvas) {
    this.canvas = canvas
  }

  load (terrain) {
    this.terrain = terrain

    const terrainTypes = getUniqueTerrainTypes(terrain)
    return loadTerrainTextures(terrainTypes).then((textures) => {
      this.terrainTextures = textures
    })
  }

  render () {
    const ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.terrain.forEach((row, y) => {
      row.forEach((tile, x) => {
        const texture = this.terrainTextures[tile.type]
        ctx.drawImage(texture,
          (x * TILE_SIZE) % texture.width, (y * TILE_SIZE) % texture.height,
          TILE_SIZE, TILE_SIZE,
          x * TILE_SIZE, y * TILE_SIZE,
          TILE_SIZE, TILE_SIZE)
      })
    })
  }
}
