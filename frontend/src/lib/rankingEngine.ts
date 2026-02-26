import type { RaceFrame } from "./types"

type DriverProgress = {
  driver: string
  progress: number
}

type DriverState = {
  lastAngle: number
  lastDistance: number
  totalProgress: number
}

export class RankingEngine {
  private previousOrder: string[] = []
  private currentOrder: string[] = []
  private driverStates: Map<string, DriverState> = new Map()
  private trackLength: number

  constructor(trackLength: number) {
    this.trackLength = trackLength
  }

  setTrackLength(trackLength: number) {
    this.trackLength = trackLength
  }

  update(frame: RaceFrame) {
    const progresses: DriverProgress[] = []

    for (const driver in frame) {
      const state = frame[driver]

      const distance = state.distance
      const hasDistance = Number.isFinite(distance) && this.trackLength > 0

      // Compute current angle for fallback
      let angle = Math.atan2(state.y, state.x)

      // Normalize to 0 → 2π
      if (angle < 0) {
        angle += Math.PI * 2
      }

      // Get or initialize driver state
      let driverState = this.driverStates.get(driver)
      if (!driverState) {
        driverState = {
          lastAngle: angle,
          lastDistance: hasDistance ? distance : 0,
          totalProgress: hasDistance ? distance : angle,
        }
        this.driverStates.set(driver, driverState)
      }

      if (hasDistance) {
        const distanceDiff = distance - driverState.lastDistance
        const wrapThreshold = this.trackLength * 0.5

        if (distanceDiff < -wrapThreshold) {
          // Crossed start/finish forward (distance reset)
          driverState.totalProgress += (this.trackLength - driverState.lastDistance) + distance
        } else if (distanceDiff > wrapThreshold) {
          // Crossed start/finish backward (unlikely)
          driverState.totalProgress += distanceDiff - this.trackLength
        } else {
          driverState.totalProgress += distanceDiff
        }

        driverState.lastDistance = distance
      } else {
        // Detect lap crossing: if we go from ~2π to ~0, we've crossed the finish
        const angleDiff = angle - driverState.lastAngle
        
        if (angleDiff < -Math.PI) {
          // Crossed finish line forward (from ~2π to ~0)
          driverState.totalProgress += (angle + Math.PI * 2 - driverState.lastAngle)
        } else if (angleDiff > Math.PI) {
          // Crossed finish line backward (from ~0 to ~2π) - unlikely but handle it
          driverState.totalProgress += (angle - Math.PI * 2 - driverState.lastAngle)
        } else {
          // Normal progression
          driverState.totalProgress += angleDiff
        }

        driverState.lastAngle = angle
      }

      progresses.push({
        driver,
        progress: driverState.totalProgress,
      })
    }

    // Sort descending (higher progress = further along)
    progresses.sort((a, b) => b.progress - a.progress)

    this.previousOrder = [...this.currentOrder]
    this.currentOrder = progresses.map((p) => p.driver)
  }

  getOrder(): string[] {
    return this.currentOrder
  }

  getOvertakes(): { overtaker: string; overtaken: string }[] {
    const overtakes: { overtaker: string; overtaken: string }[] = []

    if (this.previousOrder.length === 0) return overtakes

    for (let i = 0; i < this.currentOrder.length; i++) {
      const driver = this.currentOrder[i]
      const previousIndex = this.previousOrder.indexOf(driver)

      if (previousIndex > i) {
        const overtaken = this.previousOrder[i]
        overtakes.push({ overtaker: driver, overtaken })
      }
    }

    return overtakes
  }
}