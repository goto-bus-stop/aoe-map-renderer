const MapRenderer = require('./MapRenderer')

const canvas = document.createElement('canvas')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const renderer = new MapRenderer(canvas)

renderer.load(require('./demoMap.json')).then(() => {
  requestAnimationFrame(() => renderer.render())
})

document.body.appendChild(canvas)

window.renderer = renderer

window.onresize = () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  renderer.render()
}
