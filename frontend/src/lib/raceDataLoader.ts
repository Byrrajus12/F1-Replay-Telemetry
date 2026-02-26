import type { RaceData, RaceFrame, RaceSessionData, TrackPoint } from "./types"

type Normalizer = (point: TrackPoint) => TrackPoint

type TelemetryPoint = {
  t: number
  x: number
  y: number
  s: number
  d: number
}

function interpolateTelemetry(a: TelemetryPoint, b: TelemetryPoint, t: number): TelemetryPoint {
  if (a.t === b.t) return a

  const alpha = (t - a.t) / (b.t - a.t)

  return {
    t,
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    s: a.s + (b.s - a.s) * alpha,
    d: a.d + (b.d - a.d) * alpha,
  }
}

export function buildRaceDataFromSession(
  session: RaceSessionData,
  normalizePoint: Normalizer,
  fps = 10
): RaceData {
  const driverCodes = Object.keys(session.drivers)
  const telemetryMap: Record<string, TelemetryPoint[]> = {}

  let maxTime = 0

  for (const driver of driverCodes) {
    const telemetry = session.drivers[driver].telemetry
    telemetryMap[driver] = telemetry

    if (telemetry.length > 0) {
      const lastTime = telemetry[telemetry.length - 1].t
      if (lastTime > maxTime) maxTime = lastTime
    }
  }

  const dt = 1 / fps
  const totalFrames = Math.floor(maxTime * fps) + 1
  const frames: RaceFrame[] = []

  const driverIndices: Record<string, number> = {}
  for (const driver of driverCodes) {
    driverIndices[driver] = 0
  }

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const currentTime = frameIndex * dt
    const frame: RaceFrame = {}

    for (const driver of driverCodes) {
      const telemetry = telemetryMap[driver]
      if (telemetry.length === 0) continue

      let index = driverIndices[driver]

      while (index < telemetry.length - 1 && telemetry[index + 1].t <= currentTime) {
        index += 1
      }

      driverIndices[driver] = index

      const pointA = telemetry[index]
      const pointB = telemetry[Math.min(index + 1, telemetry.length - 1)]
      const sample = interpolateTelemetry(pointA, pointB, currentTime)

      const metersPoint = {
        x: sample.x / 10,
        y: sample.y / 10,
      }

      const normalized = normalizePoint(metersPoint)

      const dx = pointB.x - pointA.x
      const dy = pointB.y - pointA.y
      const heading = dx !== 0 || dy !== 0 ? Math.atan2(dy, dx) : 0

      frame[driver] = {
        x: normalized.x,
        y: normalized.y,
        speed: sample.s,
        drs: false,
        heading,
        distance: sample.d,
      }
    }

    frames.push(frame)
  }

  return {
    fps,
    duration: totalFrames / fps,
    frames,
  }
}
