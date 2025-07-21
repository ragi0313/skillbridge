import { useEffect, useState } from "react"

export function useEmailAvailability(email: string) {
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const checkEmail = setTimeout(async () => {
      if (!email || !email.includes("@")) {
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
    }, 500)

    return () => clearTimeout(checkEmail)
  }, [email])

  return { emailAvailable, isChecking }
}
