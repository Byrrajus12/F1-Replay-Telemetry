export type DriverState = {
  x: number
  y: number
  speed: number
  drs: boolean
  heading: number
  distance: number
}

export type RaceFrame = {
  [driverCode: string]: DriverState
}

export type RaceData = {
  fps: number
  duration: number
  frames: RaceFrame[]
}

export type TelemetryPoint = {
  t: number
  d: number
  x: number
  y: number
  z?: number
  s: number // Speed in km/h
  rpm?: number // Engine RPM
  g?: number // Gear number (1-8)
  th?: number // Throttle percentage (0-100)
  br?: boolean // Brake status
  drs: number // DRS status (0=off, 8=available, 10=available but not activated, 12=activated, 14=enabled)
}

export type TrackMetadata = {
  source: string
  track: string
  trackLength: number // meters
  year: number
  session: string // 'Q' or 'R'
  lapTime: string // formatted as "M:SS.SSS"
  driver: string // Driver code (VER, HAM, LEC, etc)
  samplingRate: string
  coordinateUnit: string
}

export type QualifyingLapData = {
  metadata: TrackMetadata
  telemetry: TelemetryPoint[]
}

// FastF1 Race Session Data Types
export type RaceTelemetryPoint = {
  t: number // Time in seconds
  x: number // X coordinate in 1/10 meter units
  y: number // Y coordinate in 1/10 meter units
  s: number // Speed in km/h
  d: number // Distance along track in meters
}

export type RaceDriverTelemetry = {
  driver: string
  team: string
  telemetry: RaceTelemetryPoint[]
}

export type RaceSessionMetadata = {
  source: string
  track: string
  year: number
  round: number
  session: string
  laps: number
  drivers: number
  coordinateUnit: string
}

export type RaceSessionData = {
  metadata: RaceSessionMetadata
  drivers: Record<string, RaceDriverTelemetry>
}

export type TrackPoint = {
  x: number
  y: number
}

export type DRSZone = {
  startIndex: number
  endIndex: number
}

export type TrackBoundary = {
  centerLine: TrackPoint[]
  innerBoundary: TrackPoint[]
  outerBoundary: TrackPoint[]
  drsZones: DRSZone[]
  bounds: {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }
  trackName: string
  trackLength: number
}
