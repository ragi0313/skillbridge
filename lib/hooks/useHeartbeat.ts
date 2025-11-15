import { useEffect, useRef } from "react"

/**
 * Hook to send periodic heartbeat to server to keep user status as "online"
 * Sends a heartbeat every 5 minutes while the user is active
 */
export function useHeartbeat() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/auth/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      } catch (error) {
        // Silently fail - heartbeat is not critical
        console.debug("Heartbeat failed:", error)
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Send heartbeat every 5 minutes (300000ms)
    intervalRef.current = setInterval(sendHeartbeat, 5 * 60 * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])
}
