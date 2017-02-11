const MapRenderer = require('./MapRenderer')

const canvas = document.createElement('canvas')
canvas.width = document.body.scrollWidth
canvas.height = document.body.scrollHeight

const renderer = new MapRenderer(canvas)

renderer.load(require('./demoMap.json')).then(() => {
  renderer.render()
})

document.body.appendChild(canvas)

window.renderer = renderer
