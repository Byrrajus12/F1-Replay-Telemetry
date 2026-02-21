"use client"

import { useEffect, useRef, useState } from "react"
import type { Application } from "pixi.js"
import { initRenderer } from "@/lib/renderer"
import type { ReplayController } from "@/lib/replayController"

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)

  const [replay, setReplay] = useState<ReplayController | null>(null)
  const [resetCamera, setResetCamera] = useState<(() => void) | null>(null)
  const [setFollowDriver, setSetFollowDriver] = useState<
    ((driver: string | null) => void) | null
  >(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    let app: Application | null = null

    const setup = async () => {
      const result = await initRenderer(containerRef.current!)
      app = result.app
      setReplay(result.replay)
      setResetCamera(() => result.resetCamera)
      setSetFollowDriver(() => result.setFollowDriver)
      setDuration(result.replay.getDuration())
    }

    setup()

    return () => {
      if (app) app.destroy(true)
    }
  }, [])

  // Sync timeline
  useEffect(() => {
    if (!replay) return

    let id: number

    const loop = () => {
      setCurrentTime(replay.getCurrentTime())
      id = requestAnimationFrame(loop)
    }

    loop()

    return () => cancelAnimationFrame(id)
  }, [replay])

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100vh" }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.75)",
          padding: "16px",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          minWidth: "420px",
        }}
      >
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={currentTime}
          onChange={(e) => {
            const value = Number(e.target.value)
            replay?.seek(value)
            setCurrentTime(value)
          }}
        />

        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <button onClick={() => replay?.play()}>Play</button>
          <button onClick={() => replay?.pause()}>Pause</button>
          <button onClick={() => replay?.restart()}>Restart</button>
          <button onClick={() => resetCamera?.()}>Reset Camera</button>

          <select
            defaultValue="1"
            onChange={(e) =>
              replay?.setSpeed(Number(e.target.value))
            }
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>

          <button onClick={() => setFollowDriver?.("VER")}>
            Follow VER
          </button>
          <button onClick={() => setFollowDriver?.("HAM")}>
            Follow HAM
          </button>
          <button onClick={() => setFollowDriver?.(null)}>
            Free Cam
          </button>
        </div>
      </div>
    </>
  )
}