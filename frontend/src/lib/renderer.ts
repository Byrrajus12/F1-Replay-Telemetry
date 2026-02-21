import * as PIXI from "pixi.js"

export async function initRenderer(container: HTMLDivElement) {
  const app = new PIXI.Application()

  await app.init({
    resizeTo: container,
    backgroundColor: 0x111111,
    antialias: true,
  })

  // In Pixi v8, it's app.canvas (NOT app.view)
  container.appendChild(app.canvas)

  return app
}