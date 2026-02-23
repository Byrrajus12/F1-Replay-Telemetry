import type { RaceData, RaceFrame } from "./types"

export function generateMockRaceData(): RaceData {
  const fps = 60
  const duration = 20
  const totalFrames = fps * duration

  const radiusX = 300
  const radiusY = 200

  // Speed affects angular velocity (track circumference ~= 2π * avg radius)
  // Base speed 300 km/h → base angular velocity
  const baseSpeed = 300
  const baseAngularVelocity = 0.8 // radians per second
  
  const verSpeed = 340
  const hamSpeed = 220 // HAM is slower
  const lecSpeed = 270 // LEC is in the middle
  
  const verAngularVelocity = baseAngularVelocity * (verSpeed / baseSpeed)
  const hamAngularVelocity = baseAngularVelocity * (hamSpeed / baseSpeed)
  const lecAngularVelocity = baseAngularVelocity * (lecSpeed / baseSpeed)

  const frames: RaceFrame[] = []
  
  let verAngle = 0
  let hamAngle = Math.PI // Start on opposite side
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
      },
      HAM: {
        x: Math.cos(hamAngle) * radiusX,
        y: Math.sin(hamAngle) * radiusY,
        speed: hamSpeed,
        drs: false,
        heading: hamAngle + Math.PI / 2,  
      },
      LEC: {
        x: Math.cos(lecAngle) * radiusX,
        y: Math.sin(lecAngle) * radiusY,
        speed: lecSpeed,
        drs: false,
        heading: lecAngle + Math.PI / 2,  
      },
    })
    
    // Update angles based on speed
    verAngle += verAngularVelocity * dt
    hamAngle += hamAngularVelocity * dt
    lecAngle += lecAngularVelocity * dt
  }

  return { fps, duration, frames }
}