import type { QualifyingLapData, TrackBoundary, TrackPoint, DRSZone } from "./types"

/**
 * Processes a qualifying lap telemetry into track boundary data
 */

export function processLapToTrack(lapData: QualifyingLapData): TrackBoundary {
  const { telemetry, metadata } = lapData

  // Extract and convert coordinates from 1/10 meter to meters
  const centerLine: TrackPoint[] = telemetry.map((point) => ({
    x: point.x / 10,
    y: point.y / 10,
  }))

  // Calculate track boundaries using perpendicular normals
  const { innerBoundary, outerBoundary } = calculateBoundaries(centerLine)

  // Extract DRS zones
  const drsZones = extractDRSZones(telemetry)

  // Calculate bounds
  const bounds = calculateBounds([...centerLine, ...innerBoundary, ...outerBoundary])

  return {
    centerLine,
    innerBoundary,
    outerBoundary,
    drsZones,
    bounds,
    trackName: metadata.track,
    trackLength: metadata.trackLength,
  }
}

/**
 * Calculate inner and outer track boundaries using gradient normals
 * Track width: 20 meters (200m actual width / 10 scale factor)
 */
function calculateBoundaries(
  centerLine: TrackPoint[]
): { innerBoundary: TrackPoint[]; outerBoundary: TrackPoint[] } {
  const trackWidth = 20 // meters (scaled for 1/10 meter coordinate system)
  const halfWidth = trackWidth / 2

  const innerBoundary: TrackPoint[] = []
  const outerBoundary: TrackPoint[] = []

  for (let i = 0; i < centerLine.length; i++) {
    const current = centerLine[i]

    // Calculate tangent using central difference
    // At start/end, use forward/backward difference
    let dx: number, dy: number

    if (i === 0) {
      // Forward difference
      dx = centerLine[1].x - current.x
      dy = centerLine[1].y - current.y
    } else if (i === centerLine.length - 1) {
      // Backward difference
      dx = current.x - centerLine[i - 1].x
      dy = current.y - centerLine[i - 1].y
    } else {
      // Central difference
      dx = centerLine[i + 1].x - centerLine[i - 1].x
      dy = centerLine[i + 1].y - centerLine[i - 1].y
    }

    // Normalize tangent vector
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length === 0) {
      // Degenerate case, use previous normal or skip
      if (innerBoundary.length > 0) {
        innerBoundary.push({ ...innerBoundary[innerBoundary.length - 1] })
        outerBoundary.push({ ...outerBoundary[outerBoundary.length - 1] })
      } else {
        innerBoundary.push(current)
        outerBoundary.push(current)
      }
      continue
    }

    dx /= length
    dy /= length

    // Calculate perpendicular normal (rotate tangent 90 degrees)
    // Normal points to the left: (nx, ny) = (-dy, dx)
    const nx = -dy
    const ny = dx

    // Generate inner and outer points
    const innerPoint: TrackPoint = {
      x: current.x - nx * halfWidth,
      y: current.y - ny * halfWidth,
    }

    const outerPoint: TrackPoint = {
      x: current.x + nx * halfWidth,
      y: current.y + ny * halfWidth,
    }

    innerBoundary.push(innerPoint)
    outerBoundary.push(outerPoint)
  }

  return { innerBoundary, outerBoundary }
}

/**
 * Extract DRS zones from telemetry
 * DRS zones are identified where DRS >= 10 (available or active)
 */
function extractDRSZones(telemetry: QualifyingLapData["telemetry"]): DRSZone[] {
  const zones: DRSZone[] = []
  let inZone = false
  let zoneStart = 0

  for (let i = 0; i < telemetry.length; i++) {
    const hasDRS = telemetry[i].drs >= 10
    const hadDRS = i > 0 ? telemetry[i - 1].drs >= 10 : false

    if (hasDRS && !hadDRS) {
      // Entering DRS zone
      inZone = true
      zoneStart = i
    } else if (!hasDRS && hadDRS) {
      // Exiting DRS zone
      if (inZone && i > zoneStart) {
        zones.push({
          startIndex: zoneStart,
          endIndex: i - 1,
        })
      }
      inZone = false
    }
  }

  // Handle case where DRS zone extends to end of lap
  if (inZone && telemetry.length > zoneStart) {
    zones.push({
      startIndex: zoneStart,
      endIndex: telemetry.length - 1,
    })
  }

  return zones
}

/**
 * Calculate bounding box for all track points
 */
function calculateBounds(
  points: TrackPoint[]
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  if (points.length === 0) {
    return { xMin: 0, xMax: 0, yMin: 0, yMax: 0 }
  }

  let xMin = points[0].x
  let xMax = points[0].x
  let yMin = points[0].y
  let yMax = points[0].y

  for (const point of points) {
    xMin = Math.min(xMin, point.x)
    xMax = Math.max(xMax, point.x)
    yMin = Math.min(yMin, point.y)
    yMax = Math.max(yMax, point.y)
  }

  return { xMin, xMax, yMin, yMax }
}
