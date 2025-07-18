import { useCallback } from "react"

export function useFormInput<T>(formData: T, setFormData: (data: Partial<T>) => void) {
  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData({ [field]: value } as Partial<T>)
  }, [setFormData])
  
  const updateMultipleFields = useCallback((updates: Partial<T>) => {
    setFormData(updates)
  }, [setFormData])
  
  return {
    updateField,
    updateMultipleFields
  }
}