import type { RaceData, RaceFrame, DriverState } from "./types"

export class ReplayController {
  private raceData: RaceData
  private currentFramePosition = 0
  private playing = false
  private playbackSpeed = 1

  constructor(raceData: RaceData) {
    this.raceData = raceData
  }

  play() {
    this.playing = true
  }

  pause() {
    this.playing = false
  }

  restart() {
    this.currentFramePosition = 0
  }

  isPlaying() {
    return this.playing
  }

  setSpeed(speed: number) {
    this.playbackSpeed = speed
  }

  getDuration(): number {
    return this.raceData.duration
  }

  getCurrentTime(): number {
    return this.currentFramePosition / this.raceData.fps
  }

  seek(seconds: number) {
    const clamped = Math.max(0, Math.min(seconds, this.getDuration()))
    this.currentFramePosition = clamped * this.raceData.fps
  }

  update(deltaSeconds: number): RaceFrame | null {
    if (this.playing) {
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

    const interpolated: RaceFrame = {}

    for (const driverCode in frameA) {
      const a = frameA[driverCode]
      const b = frameB[driverCode]

      const x = a.x + (b.x - a.x) * alpha
      const y = a.y + (b.y - a.y) * alpha
      const dx = b.x - a.x
      const dy = b.y - a.y
      const heading = Math.atan2(dy, dx)

      interpolated[driverCode] = {
        x,
        y,
        speed: a.speed + (b.speed - a.speed) * alpha,
        drs: a.drs,
        heading,
      }
    }

    return interpolated
  }
}