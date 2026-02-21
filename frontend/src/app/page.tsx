"use client"

import { useEffect, useRef } from "react"
import type { Application } from "pixi.js"
import { initRenderer } from "@/lib/renderer"

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let app: Application | null = null

    const setup = async () => {
      app = await initRenderer(containerRef.current!)
    }

    setup()

    return () => {
      if (app) {
        app.destroy(true)
      }
    }
  }, [])

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
}