import { getTimeZones } from "@vvo/tzdb"

// Philippines-only timezones since the platform operates exclusively in the Philippines
export const PHILIPPINE_TIMEZONE_NAMES = [
  "Asia/Manila", // Philippine Standard Time (PST) - UTC+8
]

// For reference: The Philippines uses a single timezone (Philippine Standard Time)
// UTC+8 year-round with no daylight saving time
export const philippineTimeZones = getTimeZones()
  .filter((tz) => PHILIPPINE_TIMEZONE_NAMES.includes(tz.name))
  .map((tz) => {
    const offsetHours = tz.currentTimeOffsetInMinutes / 60
    const offsetSign = offsetHours >= 0 ? "+" : "-"
    const offsetLabel = `GMT${offsetSign}${Math.abs(offsetHours)}`

    return {
      label: `Philippine Standard Time (${offsetLabel})`,
      value: tz.name,
    }
  })

// Legacy export for backward compatibility
export const commonTimeZones = philippineTimeZones

export const getDefaultTimezone = (): string => {
  // Always return Philippine timezone since platform is Philippines-only
  return "Asia/Manila"
}

// Helper function to check if timezone is valid for Philippines
export const isValidPhilippineTimezone = (timezone: string): boolean => {
  return PHILIPPINE_TIMEZONE_NAMES.includes(timezone)
}

// Helper to ensure Philippine timezone
export const ensurePhilippineTimezone = (timezone?: string): string => {
  if (timezone && isValidPhilippineTimezone(timezone)) {
    return timezone
  }
  return "Asia/Manila"
}
