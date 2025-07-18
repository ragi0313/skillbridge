import { useState } from "react"

export function usePasswordVisibility() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const togglePassword = () => setShowPassword(!showPassword)
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword)
  
  return {
    showPassword,
    showConfirmPassword,
    togglePassword,
    toggleConfirmPassword
  }
}