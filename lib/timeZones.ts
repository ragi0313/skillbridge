import { getTimeZones } from "@vvo/tzdb"

export const CURATED_TIMEZONE_NAMES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Africa/Johannesburg",
  "Etc/UTC",
]

export const commonTimeZones = getTimeZones()
  .filter((tz) => CURATED_TIMEZONE_NAMES.includes(tz.name))
  .map((tz) => {
    const offsetHours = tz.currentTimeOffsetInMinutes / 60
    const offsetSign = offsetHours >= 0 ? "+" : "-"
    const offsetLabel = `GMT${offsetSign}${Math.abs(offsetHours)}`
    const mainCity = tz.mainCities?.[0] ?? tz.name

    return {
      label: `${mainCity} (${offsetLabel})`,
      value: tz.name,
    }
  })

export const getDefaultTimezone = (): string | undefined => {
  const guess = Intl.DateTimeFormat().resolvedOptions().timeZone
  return CURATED_TIMEZONE_NAMES.includes(guess) ? guess : undefined
}
