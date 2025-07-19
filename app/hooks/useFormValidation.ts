import { useMemo } from "react"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

type BaseFormData = {
  firstName: string
  lastName: string
  email: string
  country: string
  password: string
  confirmPassword: string
}

type MentorFormData = BaseFormData & {
  profilePicture: File | null
}

export function useFormValidation<T extends BaseFormData>(
  formData: T, 
  emailAvailable: boolean | null
) {
  const isEmailValid = emailRegex.test(formData.email)
  const isPasswordValid = passwordRegex.test(formData.password)
  const doPasswordsMatch = formData.password === formData.confirmPassword
  
  const isFormValid = useMemo(() => {
  const baseValid =
    formData.firstName?.trim() &&
    formData.lastName?.trim() &&
    isEmailValid &&
    emailAvailable === true &&
    formData.country &&
    isPasswordValid &&
    doPasswordsMatch;

  if ("profilePicture" in formData) {
    return baseValid && (formData as MentorFormData).profilePicture !== null;
  }

  return baseValid;
}, [formData, emailAvailable, isEmailValid, isPasswordValid, doPasswordsMatch]);

  
  return {
    isFormValid,
    isEmailValid,
    isPasswordValid,
    doPasswordsMatch,
    emailRegex,
    passwordRegex
  }
}