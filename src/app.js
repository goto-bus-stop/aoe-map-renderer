const raf = require('raf')
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

renderer.load(require('./demoMap.json')).then(() => {
  ready = true
  render()
})

document.body.appendChild(canvas)

window.renderer = renderer

window.onresize = () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  render()
}
