import type { RaceData, RaceFrame, TrackPoint } from "./types"

export function generateMockRaceData(centerLine?: TrackPoint[]): RaceData {
  const fps = 60
  const duration = 20
  const totalFrames = fps * duration

  const radiusX = 300
  const radiusY = 200

  // If centerLine is provided, use it for track-based positioning
  if (centerLine && centerLine.length > 2) {
    // Driver speeds in km/h
    const verSpeed = 340
    const hamSpeed = 220
    const lecSpeed = 270

    // Estimate track length and calculate advancement rate
    let totalDistance = 0
    for (let i = 1; i < centerLine.length; i++) {
      const dx = centerLine[i].x - centerLine[i - 1].x
      const dy = centerLine[i].y - centerLine[i - 1].y
      totalDistance += Math.sqrt(dx * dx + dy * dy)
    }

    const trackLength = totalDistance
    const pointsPerMeter = centerLine.length / trackLength

    // Calculate advancement speed (points per second for each driver)
    const verPointsPerSec = (verSpeed / 3.6) * pointsPerMeter // convert km/h to m/s
    const hamPointsPerSec = (hamSpeed / 3.6) * pointsPerMeter
    const lecPointsPerSec = (lecSpeed / 3.6) * pointsPerMeter

    const frames: RaceFrame[] = []

    // Track indices for each driver
    let verIndex = 0
    let hamIndex = centerLine.length * 0.5
    let lecIndex = centerLine.length * 0.25

    function getPositionAndHeading(index: number): { x: number; y: number; heading: number; distance: number } {
      const cl = centerLine! // Non-null assertion since we checked it above
      const wrappedIndex = ((index % cl.length) + cl.length) % cl.length
      const currentIndex = Math.floor(wrappedIndex)
      const nextIndex = (currentIndex + 1) % cl.length

      const current = cl[currentIndex]
      const next = cl[nextIndex]

      const fraction = wrappedIndex - currentIndex
      const x = current.x + (next.x - current.x) * fraction
      const y = current.y + (next.y - current.y) * fraction
      const heading = Math.atan2(next.y - current.y, next.x - current.x)

      const distance = wrappedIndex / pointsPerMeter

      return { x, y, heading, distance }
    }

    for (let i = 0; i < totalFrames; i++) {
      const dt = 1 / fps

      const verPos = getPositionAndHeading(verIndex)
      const hamPos = getPositionAndHeading(hamIndex)
      const lecPos = getPositionAndHeading(lecIndex)

      frames.push({
        VER: {
          x: verPos.x,
          y: verPos.y,
          speed: verSpeed,
          drs: false,
          heading: verPos.heading,
          distance: verPos.distance,
        },
        HAM: {
          x: hamPos.x,
          y: hamPos.y,
          speed: hamSpeed,
          drs: false,
          heading: hamPos.heading,
          distance: hamPos.distance,
        },
        LEC: {
          x: lecPos.x,
          y: lecPos.y,
          speed: lecSpeed,
          drs: false,
          heading: lecPos.heading,
          distance: lecPos.distance,
        },
      })

      verIndex += verPointsPerSec * dt
      hamIndex += hamPointsPerSec * dt
      lecIndex += lecPointsPerSec * dt
    }

    return { fps, duration, frames }
  }

  // Fallback to ellipse-based positioning (original logic)
  const baseSpeed = 300
  const baseAngularVelocity = 0.8

  const verSpeed = 340
  const hamSpeed = 220
  const lecSpeed = 270

  const verAngularVelocity = baseAngularVelocity * (verSpeed / baseSpeed)
  const hamAngularVelocity = baseAngularVelocity * (hamSpeed / baseSpeed)
  const lecAngularVelocity = baseAngularVelocity * (lecSpeed / baseSpeed)

  const frames: RaceFrame[] = []

  let verAngle = 0
  let hamAngle = Math.PI
  let lecAngle = Math.PI

  for (let i = 0; i < totalFrames; i++) {
    const dt = 1 / fps

    frames.push({
      VER: {
        x: Math.cos(verAngle) * radiusX,
        y: Math.sin(verAngle) * radiusY,
        speed: verSpeed,
        drs: false,
        heading: verAngle + Math.PI / 2,
        distance: Number.NaN,
      },
      HAM: {
        x: Math.cos(hamAngle) * radiusX,
        y: Math.sin(hamAngle) * radiusY,
        speed: hamSpeed,
        drs: false,
        heading: hamAngle + Math.PI / 2,
        distance: Number.NaN,
      },
      LEC: {
        x: Math.cos(lecAngle) * radiusX,
        y: Math.sin(lecAngle) * radiusY,
        speed: lecSpeed,
        drs: false,
        heading: lecAngle + Math.PI / 2,
        distance: Number.NaN,
      },
    })

    verAngle += verAngularVelocity * dt
    hamAngle += hamAngularVelocity * dt
    lecAngle += lecAngularVelocity * dt
  }

  return { fps, duration, frames }
}