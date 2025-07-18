import { useMemo } from "react"
import countries from "world-countries"

export function useCountryOptions() {
  const countryOptions = useMemo(() => 
    countries.map((country) => ({
      value: country.cca2,
      label: country.name.common,
    }))
  , [])
  
  return countryOptions
}