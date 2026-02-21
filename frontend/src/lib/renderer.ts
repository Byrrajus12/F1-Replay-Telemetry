import * as PIXI from "pixi.js"
import type { Application } from "pixi.js"
import type { RaceFrame } from "./types"
import { generateMockRaceData } from "./mockData"
import { ReplayController } from "./replayController"

export async function initRenderer(container: HTMLDivElement): Promise<Application> {
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

  const track = new PIXI.Graphics()
  track
    .ellipse(centerX, centerY, radiusX, radiusY)
    .stroke({ width: 6, color: 0xffffff })

  app.stage.addChild(track)

  // ---- Replay Setup ----

  const raceData = generateMockRaceData()
  const replay = new ReplayController(raceData)
  replay.play()

// testing speed changes
//   setTimeout(() => {
//   replay.setSpeed(2)
// }, 3000)

//     setTimeout(() => {
//   replay.setSpeed(0.25)
// }, 3000)

  // ---- Car registry ----

  const carMap = new Map<string, PIXI.Graphics>()

  function ensureCar(driverCode: string): PIXI.Graphics {
    if (carMap.has(driverCode)) {
      return carMap.get(driverCode)!
    }

    const car = new PIXI.Graphics()
    car.circle(0, 0, 8).fill(driverCode === "VER" ? 0x1e90ff : 0xff0000)

    app.stage.addChild(car)
    carMap.set(driverCode, car)

    return car
  }

  function renderFrame(frame: RaceFrame) {
    const centerX = app.screen.width / 2
    const centerY = app.screen.height / 2

    for (const driverCode in frame) {
      const state = frame[driverCode]
      const car = ensureCar(driverCode)

      car.position.set(centerX + state.x, centerY + state.y)
    }
  }

  app.ticker.add((ticker) => {
    const deltaSeconds = ticker.deltaMS / 1000
    const frame = replay.update(deltaSeconds)

    if (frame) {
      renderFrame(frame)
    }
  })

  return app
}