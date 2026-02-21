import type { RaceData, RaceFrame } from "./types"

export class ReplayController {
  private raceData: RaceData
  private currentFrameIndex = 0
  private isPlaying = false
  private playbackSpeed = 1
  private accumulator = 0

  constructor(raceData: RaceData) {
    this.raceData = raceData
  }

  play() {
    this.isPlaying = true
  }

  pause() {
    this.isPlaying = false
  }

  setSpeed(speed: number) {
    this.playbackSpeed = speed
  }

  update(deltaTime: number): RaceFrame | null {
    if (!this.isPlaying) {
      return this.raceData.frames[this.currentFrameIndex]
    }

    const secondsPerFrame = 1 / this.raceData.fps
    this.accumulator += deltaTime * this.playbackSpeed

    while (this.accumulator >= secondsPerFrame) {
      this.accumulator -= secondsPerFrame
      this.currentFrameIndex++

      if (this.currentFrameIndex >= this.raceData.frames.length) {
        this.currentFrameIndex = this.raceData.frames.length - 1
        this.pause()
        break
      }
    }

    return this.raceData.frames[this.currentFrameIndex]
  }
}