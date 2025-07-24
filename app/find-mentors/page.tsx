"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Header from "@/components/landing/Header"
import { HeroSection } from "@/components/find-mentors/HeroSection"
import { FilterBar } from "@/components/find-mentors/FilterBar"
import { MentorList } from "@/components/find-mentors/MentorList"
import type { Mentor } from "@/components/find-mentors/types"

export default function FindMentorsPage() {
  const searchParams = useSearchParams()
  const initialSearchQuery = searchParams.get("search") || ""
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [experienceRange, setExperienceRange] = useState<[number, number]>([0, 20])
  const [rateRange, setRateRange] = useState<[number, number]>([0, 1000])
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 5])
  const [sortBy, setSortBy] = useState<string>("highest-rated")
  const [currentPage, setCurrentPage] = useState(1)
  const MENTORS_PER_PAGE = 8

  // Fetch mentors from API
  useEffect(() => {
    const fetchMentors = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/find-mentor")
        if (response.ok) {
          const data = await response.json()
          setMentors(data)
          setFilteredMentors(data)
        } else {
          console.error("Failed to fetch mentors")
          setMentors([])
          setFilteredMentors([])
        }
      } catch (error) {
        console.error("Error fetching mentors:", error)
        setMentors([])
        setFilteredMentors([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchMentors()
  }, [])

  // Filter logic
  useEffect(() => {
    let filtered = mentors.filter((mentor) => {
      const matchesSearch =
        searchQuery === "" ||
        mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentor.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
        mentor.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSkills = selectedSkills.length === 0 || selectedSkills.some((skill) => mentor.skills.includes(skill))
      const matchesLanguages =
        selectedLanguages.length === 0 || selectedLanguages.some((lang) => mentor.languages.includes(lang))
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(mentor.country)
      const matchesExperience = mentor.experience >= experienceRange[0] && mentor.experience <= experienceRange[1]
      const matchesRate = true
      const matchesRating = mentor.rating >= ratingRange[0] && mentor.rating <= ratingRange[1]
      return (
        matchesSearch &&
        matchesSkills &&
        matchesLanguages &&
        matchesCountry &&
        matchesExperience &&
        matchesRate &&
        matchesRating
      )
    })

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case "highest-rated":
          return b.rating - a.rating
        case "lowest-price":
          return a.hourlyRate - b.hourlyRate
        case "highest-price":
          return b.hourlyRate - a.hourlyRate
        case "most-experienced":
          return b.experience - a.experience
        case "most-sessions":
          return b.reviewCount - a.reviewCount
        default:
          return 0
      }
    })

    setFilteredMentors(filtered)
    setCurrentPage(1)
  }, [
    mentors,
    searchQuery,
    selectedSkills,
    selectedLanguages,
    selectedCountries,
    experienceRange,
    rateRange,
    ratingRange,
    sortBy,
  ])

  const totalPages = Math.ceil(filteredMentors.length / MENTORS_PER_PAGE)
  const startIndex = (currentPage - 1) * MENTORS_PER_PAGE
  const paginatedMentors = filteredMentors.slice(startIndex, startIndex + MENTORS_PER_PAGE)
  const handleLoadMore = () => setCurrentPage((prev) => prev + 1)

  const allSkills = Array.from(new Set(mentors.flatMap((mentor) => mentor.skills)))
  const allLanguages = Array.from(new Set(mentors.flatMap((mentor) => mentor.languages)))
  const allCountries = Array.from(new Set(mentors.map((mentor) => mentor.country)))

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedSkills([])
    setSelectedLanguages([])
    setSelectedCountries([])
    setExperienceRange([0, 20])
    setRateRange([0, 200])
    setRatingRange([0, 5])
    setSortBy("highest-rated")
  }

  const hasActiveFilters =
    !!searchQuery ||
    selectedSkills.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedCountries.length > 0 ||
    experienceRange[0] > 0 ||
    experienceRange[1] < 20 ||
    rateRange[0] > 0 ||
    rateRange[1] < 200 ||
    ratingRange[0] > 0 ||
    ratingRange[1] < 5

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(
      selectedSkills.includes(skill) ? selectedSkills.filter((s) => s !== skill) : [...selectedSkills, skill],
    )
  }

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(
      selectedLanguages.includes(language)
        ? selectedLanguages.filter((l) => l !== language)
        : [...selectedLanguages, language],
    )
  }

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(
      selectedCountries.includes(country)
        ? selectedCountries.filter((c) => c !== country)
        : [...selectedCountries, country],
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Header />
      <HeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar
          searchQuery={searchQuery}
          selectedSkills={selectedSkills}
          selectedLanguages={selectedLanguages}
          selectedCountries={selectedCountries}
          experienceRange={experienceRange}
          rateRange={rateRange}
          ratingRange={ratingRange}
          sortBy={sortBy}
          allSkills={allSkills}
          allLanguages={allLanguages}
          allCountries={allCountries}
          hasActiveFilters={hasActiveFilters}
          handleSkillToggle={handleSkillToggle}
          handleLanguageToggle={handleLanguageToggle}
          handleCountryToggle={handleCountryToggle}
          setExperienceRange={setExperienceRange}
          setRateRange={setRateRange}
          setRatingRange={setRatingRange}
          setSortBy={setSortBy}
          clearAllFilters={clearAllFilters}
        />
        <MentorList
          isLoading={isLoading}
          filteredMentors={filteredMentors}
          paginatedMentors={paginatedMentors}
          currentPage={currentPage}
          totalPages={totalPages}
          handleLoadMore={handleLoadMore}
          clearAllFilters={clearAllFilters}
          MENTORS_PER_PAGE={MENTORS_PER_PAGE}
        />
      </div>
    </div>
  )
}
