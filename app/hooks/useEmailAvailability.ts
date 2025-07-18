import { useEffect, useState } from "react"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useEmailAvailability(email: string, delay: number = 500) {
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const checkEmail = setTimeout(async () => {
      if (!email || !emailRegex.test(email)) {
        setEmailAvailable(null)
        setIsChecking(false)
        return
      }

      setIsChecking(true)
      
      try {
        const res = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        setEmailAvailable(!data.exists)
      } catch {
        setEmailAvailable(null)
      } finally {
        setIsChecking(false)
      }
    }, delay)

    return () => {
      clearTimeout(checkEmail)
      setIsChecking(false)
    }
  }, [email, delay])

  return { emailAvailable, isChecking }
}