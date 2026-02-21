export type DriverState = {
  x: number
  y: number
  speed: number
  drs: boolean
}

export type RaceFrame = {
  [driverCode: string]: DriverState
}

export type RaceData = {
  fps: number
  duration: number
  frames: RaceFrame[]
}
