import type { RaceData, RaceFrame } from "./types"

export function generateMockRaceData(): RaceData {
  const fps = 60
  const duration = 20
  const totalFrames = fps * duration

  const radiusX = 300
  const radiusY = 200

  const frames: RaceFrame[] = []

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps
    const angle1 = t * 0.8
    const angle2 = t * 0.8 + Math.PI

    frames.push({
      VER: {
        x: Math.cos(angle1) * radiusX,
        y: Math.sin(angle1) * radiusY,
        speed: 300,
        drs: false,
        heading: angle1 + Math.PI / 2,
      },
      HAM: {
        x: Math.cos(angle2) * radiusX,
        y: Math.sin(angle2) * radiusY,
        speed: 295,
        drs: false,
        heading: angle2 + Math.PI / 2,  
      },
    })
  }

  return { fps, duration, frames }
}