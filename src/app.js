const rafloop = require('raf-loop')
const RecordedGame = require('recage').default
const genieScx = require('genie-scx')
const fileReader = require('file-component')
const MapRenderer = require('./MapRenderer')

const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const renderer = new MapRenderer(canvas)
let ready = false

function open (file) {
  fileReader(file).toArrayBuffer((err, result) => {
    if (err) {
      alert(`Could not open file: ${err.message}`)
      return
    }
    if (/\.mg[lxz]$/.test(file.name)) {
      RecordedGame(Buffer(result)).parseHeader(onHeader)
    } else {
      genieScx.load(Buffer(result), onScx)
    }
  })
}

const engine = rafloop(() => renderer.render())

function onHeader (err, header) {
  if (err) alert(`Could not read recorded game: ${err.message}`)
  if (header) {
    renderer.load(header.map).then(() => {
      engine.start()
    })
  }
}

function onScx (err, scx) {
  if (err) alert(`Could not read scenario: ${err.message}`)
  renderer.load(scx.map.tiles).then(() => {
    engine.start()
  })
}

document.body.appendChild(canvas)

window.renderer = renderer
window.engine = engine
window.openfile = open

window.onresize = () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
