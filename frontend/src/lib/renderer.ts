import * as PIXI from "pixi.js"
import type { Application } from "pixi.js"
import { Assets, Sprite } from "pixi.js"
import type { RaceFrame, RaceSessionData, TrackBoundary, TrackPoint } from "./types"
import { generateMockRaceData } from "./mockData"
import { ReplayController } from "./replayController"
import { RankingEngine } from "./rankingEngine"
import { processLapToTrack } from "./trackProcessor"
import { buildRaceDataFromSession } from "./raceDataLoader"

// TEAMS REGISTRY
const TEAMS_REGISTRY: Record<string, { textureFile: string; scale: number }> = {
  redbull: { textureFile: "/redbull2025.png", scale: 0.3 },
  mercedes: { textureFile: "/mercedes2025.png", scale: 0.3 },
  ferrari: { textureFile: "/ferrari2025.png", scale: 0.3 },
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

type TrackNormalizer = (pt: TrackPoint) => TrackPoint

/**
 * Build a normalization function to fit track bounds at world origin (0,0)
 */
function getTrackNormalizer(trackBoundary: TrackBoundary, targetRadiusX: number, targetRadiusY: number): TrackNormalizer {
  const { xMin, xMax, yMin, yMax } = trackBoundary.bounds

  // Calculate current bounds
  const currentWidth = xMax - xMin
  const currentHeight = yMax - yMin
  const currentCenterX = (xMin + xMax) / 2
  const currentCenterY = (yMin + yMax) / 2

  // Calculate scale to fit target bounds
  const scaleX = (targetRadiusX * 2 * 0.9) / currentWidth // 0.9 = 90% padding
  const scaleY = (targetRadiusY * 2 * 0.9) / currentHeight
  const scale = Math.min(scaleX, scaleY) // Uniform scaling

  return (pt: TrackPoint): TrackPoint => ({
    x: (pt.x - currentCenterX) * scale,
    y: (pt.y - currentCenterY) * scale,
  })
}

/**
 * Normalize track to fit ellipse bounds at world origin (0,0)
 */
function normalizeTrack(trackBoundary: TrackBoundary, normalizePoint: TrackNormalizer): TrackBoundary {
  const normalizedCenterLine = trackBoundary.centerLine.map(normalizePoint)
  const normalizedInnerBoundary = trackBoundary.innerBoundary.map(normalizePoint)
  const normalizedOuterBoundary = trackBoundary.outerBoundary.map(normalizePoint)

  // Recalculate bounds
  const allPoints = [...normalizedCenterLine, ...normalizedInnerBoundary, ...normalizedOuterBoundary]
  let newXMin = allPoints[0].x
  let newXMax = allPoints[0].x
  let newYMin = allPoints[0].y
  let newYMax = allPoints[0].y

  for (const pt of allPoints) {
    newXMin = Math.min(newXMin, pt.x)
    newXMax = Math.max(newXMax, pt.x)
    newYMin = Math.min(newYMin, pt.y)
    newYMax = Math.max(newYMax, pt.y)
  }

  return {
    centerLine: normalizedCenterLine,
    innerBoundary: normalizedInnerBoundary,
    outerBoundary: normalizedOuterBoundary,
    drsZones: trackBoundary.drsZones,
    bounds: {
      xMin: newXMin,
      xMax: newXMax,
      yMin: newYMin,
      yMax: newYMax,
    },
    trackName: trackBoundary.trackName,
    trackLength: trackBoundary.trackLength,
  }
}

/**
 * Draw track boundaries with thick white lines
 */
function drawTrackBoundaries(graphics: PIXI.Graphics, trackBoundary: TrackBoundary): void {
  const { innerBoundary, outerBoundary, drsZones } = trackBoundary
  
  if (outerBoundary.length < 2 || innerBoundary.length < 2) return

  // Draw thick white outer boundary
  graphics.moveTo(outerBoundary[0].x, outerBoundary[0].y)
  for (let i = 1; i < outerBoundary.length; i++) {
    graphics.lineTo(outerBoundary[i].x, outerBoundary[i].y)
  }
  graphics.lineTo(outerBoundary[0].x, outerBoundary[0].y)
  graphics.stroke({ width: 12, color: 0xffffff })

  // Draw thick white inner boundary
  graphics.moveTo(innerBoundary[0].x, innerBoundary[0].y)
  for (let i = 1; i < innerBoundary.length; i++) {
    graphics.lineTo(innerBoundary[i].x, innerBoundary[i].y)
  }
  graphics.lineTo(innerBoundary[0].x, innerBoundary[0].y)
  graphics.stroke({ width: 12, color: 0xffffff })

  // Draw DRS zones in green on the outer boundary
  for (const zone of drsZones) {
    graphics.moveTo(outerBoundary[zone.startIndex].x, outerBoundary[zone.startIndex].y)
    for (let i = zone.startIndex + 1; i <= zone.endIndex && i < outerBoundary.length; i++) {
      graphics.lineTo(outerBoundary[i].x, outerBoundary[i].y)
    }
    graphics.stroke({ width: 12, color: 0x00ff00 })
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

  // TRACK - Load from JSON and normalize to fit ellipse bounds
  const radiusX = 300
  const radiusY = 200
  
  let normalizedTrack: TrackBoundary | null = null
  let processedTrack: TrackBoundary | null = null
  let normalizePoint: TrackNormalizer | null = null
  const trackGraphics = new PIXI.Graphics()

  try {
    const barcelonaData = await import("./fixtures/barcelonaQualifyingLap.json")
    processedTrack = processLapToTrack(barcelonaData)
    normalizePoint = getTrackNormalizer(processedTrack, radiusX, radiusY)
    normalizedTrack = normalizeTrack(processedTrack, normalizePoint)
    drawTrackBoundaries(trackGraphics, normalizedTrack)
  } catch (error) {
    console.error("Failed to load track data, using fallback ellipse:", error)
    trackGraphics.ellipse(0, 0, radiusX, radiusY).stroke({ width: 6, color: 0xffffff })
  }

  world.addChild(trackGraphics)

  // REPLAY - Use normalized track centerline
  let raceData = normalizedTrack 
    ? generateMockRaceData(normalizedTrack.centerLine)
    : generateMockRaceData()

  if (normalizedTrack && processedTrack && normalizePoint) {
    try {
      const raceSession = (await import("./fixtures/raceData.json")).default as RaceSessionData
      raceData = buildRaceDataFromSession(raceSession, normalizePoint)
    } catch (error) {
      console.warn("Failed to load race data, using mock data:", error)
    }
  }
  const replay = new ReplayController(raceData)
  replay.play()

  // RANKING ENGINE
  const ranking = new RankingEngine(normalizedTrack?.trackLength ?? 0)

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