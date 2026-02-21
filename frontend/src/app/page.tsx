"use client"

import { useEffect, useRef, useState } from "react"
import type { Application } from "pixi.js"
import { initRenderer } from "@/lib/renderer"
import type { ReplayController } from "@/lib/replayController"

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [replay, setReplay] = useState<ReplayController | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let app: Application | null = null

    const setup = async () => {
      const result = await initRenderer(containerRef.current!)
      app = result.app
      setReplay(result.replay)
    }

    setup()

    return () => {
      if (app) {
        app.destroy(true)
      }
    }
  }, [])

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
          left: 20,
          background: "rgba(0,0,0,0.7)",
          padding: "12px",
          borderRadius: "8px",
          display: "flex",
          gap: "8px",
        }}
      >
        <button onClick={() => replay?.play()}>Play</button>
        <button onClick={() => replay?.pause()}>Pause</button>
        <button onClick={() => replay?.restart()}>Restart</button>

        <select
          onChange={(e) =>
            replay?.setSpeed(Number(e.target.value))
          }
          defaultValue="1"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="4">4x</option>
        </select>
      </div>
    </>
  )
}