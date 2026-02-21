import * as PIXI from "pixi.js"

export async function initRenderer(container: HTMLDivElement) {
  const app = new PIXI.Application()

  await app.init({
    resizeTo: container,
    backgroundColor: 0x111111,
    antialias: true,
  })

  container.appendChild(app.canvas)

  const centerX = app.screen.width / 2
  const centerY = app.screen.height / 2
  const radiusX = 300
  const radiusY = 200

  // Track
  const track = new PIXI.Graphics()
  track
    .ellipse(centerX, centerY, radiusX, radiusY)
    .stroke({ width: 6, color: 0xffffff })

  app.stage.addChild(track)

  // Car
  const car = new PIXI.Graphics()
  car.circle(0, 0, 8).fill(0xff0000)

  app.stage.addChild(car)

  let angle = 0

  app.ticker.add((ticker) => {
    const deltaTime = ticker.deltaTime 

    angle += 0.01 * deltaTime

    const x = centerX + Math.cos(angle) * radiusX
    const y = centerY + Math.sin(angle) * radiusY

    car.position.set(x, y)
    car.rotation = angle + Math.PI / 2
  })

  return app
}