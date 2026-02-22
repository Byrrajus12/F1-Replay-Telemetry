"use client"

import { useMemo } from "react"

type LeaderboardEntry = {
  position: number
  driverCode: string
  positionChange?: "up" | "down" | "same"
}

type LeaderboardProps = {
  order: string[]
  previousOrder?: string[]
}

export function Leaderboard({ order, previousOrder }: LeaderboardProps) {
  const entries: LeaderboardEntry[] = useMemo(() => {
    return order.map((driverCode, index) => {
      let positionChange: "up" | "down" | "same" | undefined

      if (previousOrder && previousOrder.length > 0) {
        const prevIndex = previousOrder.indexOf(driverCode)
        if (prevIndex !== -1) {
          if (prevIndex > index) {
            positionChange = "up"
          } else if (prevIndex < index) {
            positionChange = "down"
          } else {
            positionChange = "same"
          }
        }
      }

      return {
        position: index + 1,
        driverCode,
        positionChange,
      }
    })
  }, [order, previousOrder])

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        background: "rgba(0, 0, 0, 0.85)",
        border: "2px solid #e10600",
        borderRadius: "4px",
        padding: "12px",
        minWidth: "180px",
        fontFamily: "monospace",
        color: "#fff",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#e10600",
          letterSpacing: "1px",
        }}
      >
        LEADERBOARD
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {entries.map((entry) => (
          <div
            key={entry.driverCode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "4px 6px",
              background: "rgba(255, 255, 255, 0.05)",
              borderLeft: "3px solid #e10600",
            }}
          >
            <span
              style={{
                fontWeight: "bold",
                fontSize: "14px",
                minWidth: "20px",
                textAlign: "right",
              }}
            >
              {entry.position}
            </span>

            <span
              style={{
                flex: 1,
                fontSize: "14px",
                fontWeight: "bold",
                letterSpacing: "0.5px",
              }}
            >
              {entry.driverCode}
            </span>

            {entry.positionChange === "up" && (
              <span style={{ color: "#00ff00", fontSize: "12px" }}>▲</span>
            )}
            {entry.positionChange === "down" && (
              <span style={{ color: "#ff0000", fontSize: "12px" }}>▼</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
