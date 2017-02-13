const raf = require('raf')
const RecordedGame = require('recage').default
const fileReader = require('file-component')
const MapRenderer = require('./MapRenderer')

const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const renderer = new MapRenderer(canvas)
let ready = false

function render () {
  if (ready) {
    raf(() => renderer.render())
  }
}

function open (file) {
  fileReader(file).toArrayBuffer((err, result) => {
    if (err) {
      alert(`Could not open file: ${err.message}`)
      return
    }
    RecordedGame(Buffer(result)).parseHeader(onHeader)
  })
}

function onHeader (err, header) {
  if (err) alert(`Could not read recorded game: ${err.message}`)
  if (header) {
    renderer.load(header.map).then(() => {
      ready = true
      render()
    })
  }
}

document.body.appendChild(canvas)

window.renderer = renderer
window.openfile = open

window.onresize = () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  render()
}
