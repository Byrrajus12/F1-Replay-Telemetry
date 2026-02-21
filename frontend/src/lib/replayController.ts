import type { RaceData, RaceFrame, DriverState } from "./types"

export class ReplayController {
  private raceData: RaceData
  private currentFramePosition = 0 // FLOAT
  private isPlaying = false
  private playbackSpeed = 1

  constructor(raceData: RaceData) {
    this.raceData = raceData
  }

  play() {
    this.isPlaying = true
  }

  pause() {
    this.isPlaying = false
  }

  restart() {
    this.currentFramePosition = 0
  }

  setSpeed(speed: number) {
    this.playbackSpeed = speed
  }

  update(deltaSeconds: number): RaceFrame | null {
    if (this.isPlaying) {
      const framesPerSecond = this.raceData.fps
      this.currentFramePosition += deltaSeconds * framesPerSecond * this.playbackSpeed

      if (this.currentFramePosition >= this.raceData.frames.length - 1) {
        this.currentFramePosition = this.raceData.frames.length - 1
        this.pause()
      }
    }

    return this.getInterpolatedFrame()
  }

  private getInterpolatedFrame(): RaceFrame | null {
    const frames = this.raceData.frames

    if (frames.length === 0) return null

    const baseIndex = Math.floor(this.currentFramePosition)
    const nextIndex = Math.min(baseIndex + 1, frames.length - 1)

    const alpha = this.currentFramePosition - baseIndex

    const frameA = frames[baseIndex]
    const frameB = frames[nextIndex]

    const interpolatedFrame: RaceFrame = {}

    for (const driverCode in frameA) {
      const stateA = frameA[driverCode]
      const stateB = frameB[driverCode]

      interpolatedFrame[driverCode] = this.interpolateDriverState(
        stateA,
        stateB,
        alpha
      )
    }

    return interpolatedFrame
  }

  private interpolateDriverState(
    a: DriverState,
    b: DriverState,
    alpha: number
  ): DriverState {
    const x = a.x + (b.x - a.x) * alpha
    const y = a.y + (b.y - a.y) * alpha

    const dx = b.x - a.x
    const dy = b.y - a.y
    const heading = Math.atan2(dy, dx)

    return {
      x,
      y,
      speed: a.speed + (b.speed - a.speed) * alpha,
      drs: a.drs,
      heading,
    }
  }
}