import * as PIXI from "pixi.js"
import type { Application } from "pixi.js"
import { Assets, Sprite } from "pixi.js"
import type { RaceFrame } from "./types"
import { generateMockRaceData } from "./mockData"
import { ReplayController } from "./replayController"
import { RankingEngine } from "./rankingEngine"

// TEAMS REGISTRY
const TEAMS_REGISTRY: Record<string, { textureFile: string; scale: number }> = {
  redbull: { textureFile: "/redbull2025.png", scale: 0.45 },
  mercedes: { textureFile: "/mercedes2025.png", scale: 0.45 },
  ferrari: { textureFile: "/ferrari2025.png", scale: 0.45 },
}

const DRIVER_TEAMS: Record<string, string> = {
  VER: "redbull",
  HAM: "mercedes",
  LEC: "ferrari",
}

// LOADED TEXTURES
const TEAM_TEXTURES: Record<string, PIXI.Texture> = {}

// Initialize team textures
async function initializeTeams(): Promise<void> {
  for (const [teamKey, config] of Object.entries(TEAMS_REGISTRY)) {
    TEAM_TEXTURES[teamKey] = await Assets.load(config.textureFile)
  }
}

export async function initRenderer(
  container: HTMLDivElement,
  onRankingUpdate?: (order: string[]) => void
): Promise<{
  app: Application
  replay: ReplayController
  resetCamera: () => void
  setFollowDriver: (driver: string | null) => void
}> {
  const app = new PIXI.Application()

  await app.init({
    resizeTo: container,
    backgroundColor: 0x111111,
    antialias: true,
  })

  container.appendChild(app.canvas)

  // Initialize team registry
  await initializeTeams()

  // WORLD CONTAINER
  const world = new PIXI.Container()
  app.stage.addChild(world)

  // TRACK
  const radiusX = 300
  const radiusY = 200

  const track = new PIXI.Graphics()
  track
    .ellipse(0, 0, radiusX, radiusY)
    .stroke({ width: 6, color: 0xffffff })

  world.addChild(track)

  // REPLAY
  const raceData = generateMockRaceData()
  const replay = new ReplayController(raceData)
  replay.play()

  // RANKING ENGINE
  const ranking = new RankingEngine()

  // CARS
  const carMap = new Map<string, Sprite>()
  const SPRITE_ROTATION_OFFSET = Math.PI / 2

  // OVERTAKE FLASH TRACKING
  const flashTimers = new Map<string, number>()
  const FLASH_DURATION = 0.4 // seconds

  function ensureCar(driverCode: string): Sprite {
    if (carMap.has(driverCode)) {
      return carMap.get(driverCode)!
    }

    // Data-driven: look up team from registry
    const teamKey = DRIVER_TEAMS[driverCode] || "mercedes" // fallback to mercedes
    const texture = TEAM_TEXTURES[teamKey]
    const scale = TEAMS_REGISTRY[teamKey].scale

    const sprite = new Sprite(texture)

    sprite.anchor.set(0.5)
    sprite.scale.set(scale)
    sprite.roundPixels = true

    world.addChild(sprite)
    carMap.set(driverCode, sprite)

    return sprite
  }

  function renderFrame(frame: RaceFrame, deltaSeconds: number) {
    for (const driverCode in frame) {
      const state = frame[driverCode]
      const car = ensureCar(driverCode)

      car.position.set(state.x, state.y)
      car.rotation = state.heading + SPRITE_ROTATION_OFFSET
      
      // Update flash effect
      const flashTimer = flashTimers.get(driverCode)
      if (flashTimer !== undefined && flashTimer > 0) {
        const newTimer = flashTimer - deltaSeconds
        flashTimers.set(driverCode, newTimer)
        
        // Calculate fade out intensity (1.0 to 0.0)
        const intensity = Math.max(0, newTimer / FLASH_DURATION)
        
        // Subtle white tint (blend with original color)
        car.tint = 0xffffff
        car.alpha = 0.7 + (intensity * 0.3) // Subtle pulse from 0.7 to 1.0
      } else {
        car.tint = 0xffffff
        car.alpha = 1.0
      }
    }
  }

  // CAMERA STATE
  let zoom = 1
  const minZoom = 0.5
  const maxZoom = 4

  let targetX = app.screen.width / 2
  let targetY = app.screen.height / 2

  let followDriver: string | null = null

  function setFollowDriver(driver: string | null) {
    followDriver = driver
  }

  function resetCamera() {
    zoom = 1
    world.scale.set(1)
    targetX = app.screen.width / 2
    targetY = app.screen.height / 2
  }

  // ZOOM TOWARD CURSOR
  container.addEventListener("wheel", (event) => {
    event.preventDefault()

    const rect = container.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const worldPosBefore = {
      x: (mouseX - world.position.x) / zoom,
      y: (mouseY - world.position.y) / zoom,
    }

    const zoomFactor = 0.1
    zoom += event.deltaY > 0 ? -zoomFactor : zoomFactor
    zoom = Math.max(minZoom, Math.min(maxZoom, zoom))

    world.scale.set(zoom)

    const worldPosAfter = {
      x: worldPosBefore.x * zoom,
      y: worldPosBefore.y * zoom,
    }

    world.position.x = mouseX - worldPosAfter.x
    world.position.y = mouseY - worldPosAfter.y

    targetX = world.position.x
    targetY = world.position.y
  })

  // PAN
  let isDragging = false
  let lastX = 0
  let lastY = 0

  container.addEventListener("pointerdown", (e) => {
    isDragging = true
    lastX = e.clientX
    lastY = e.clientY
  })

  container.addEventListener("pointermove", (e) => {
    if (!isDragging) return

    const dx = e.clientX - lastX
    const dy = e.clientY - lastY

    targetX += dx
    targetY += dy

    lastX = e.clientX
    lastY = e.clientY
  })

  container.addEventListener("pointerup", () => {
    isDragging = false
  })

  container.addEventListener("pointerleave", () => {
    isDragging = false
  })

  // CAMERA CLAMP
  function clampCamera() {
    const marginX = app.screen.width * 0.1
    const marginY = app.screen.height * 0.1

    const minX = marginX + radiusX * zoom
    const maxX = app.screen.width - marginX - radiusX * zoom
    const minY = marginY + radiusY * zoom
    const maxY = app.screen.height - marginY - radiusY * zoom

    if (minX > maxX) {
      targetX = app.screen.width / 2
    } else {
      targetX = Math.max(minX, Math.min(maxX, targetX))
    }

    if (minY > maxY) {
      targetY = app.screen.height / 2
    } else {
      targetY = Math.max(minY, Math.min(maxY, targetY))
    }
  }

  // MAIN LOOP
  const lerpFactor = 0.1

  app.ticker.add((ticker) => {
    const deltaSeconds = ticker.deltaMS / 1000
    const frame = replay.update(deltaSeconds)

    if (!frame) return

    // RANKING UPDATE
    ranking.update(frame)

    const order = ranking.getOrder()
    const overtakes = ranking.getOvertakes()

    // Send ranking to React
    if (onRankingUpdate) {
      onRankingUpdate(order)
    }

    // Trigger flash on overtakes
    if (overtakes.length > 0) {
      overtakes.forEach(({ overtaken }) => {
        flashTimers.set(overtaken, FLASH_DURATION)
      })
    }

    renderFrame(frame, deltaSeconds)

    if (followDriver && frame[followDriver]) {
      const state = frame[followDriver]

      targetX = app.screen.width / 2 - state.x * zoom
      targetY = app.screen.height / 2 - state.y * zoom
    }

    clampCamera()

    world.position.x += (targetX - world.position.x) * lerpFactor
    world.position.y += (targetY - world.position.y) * lerpFactor
  })

  return {
    app,
    replay,
    resetCamera,
    setFollowDriver,
  }
}