import { useEffect, useState } from "react"

export function useEmailAvailability(email: string) {
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const checkEmail = setTimeout(async () => {
      if (!email || !email.includes("@")) {
        setEmailAvailable(null)
        return
      }

      try {
        const res = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })

        const data = await res.json()
        setEmailAvailable(!data.exists) // email is available if it doesn't exist
      } catch {
        setEmailAvailable(null)
      }
    }, 500)

    return () => clearTimeout(checkEmail)
  }, [email])

  return emailAvailable
}
