"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { HeroSection } from "@/components/find-mentors/HeroSection"
import { FilterBar } from "@/components/find-mentors/FilterBar"
import { MentorList } from "@/components/find-mentors/MentorList"
import type { Mentor } from "@/components/find-mentors/types"
import UnifiedHeader from "@/components/UnifiedHeader"

interface CategoryWithCount {
  id: number
  name: string
  description?: string
  mentorCount: number
  skills: string[]
}

export default function FindMentorsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialSearchQuery = searchParams.get("search") || ""
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([])
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [experienceRange, setExperienceRange] = useState<[number, number]>([0, 20])
  const [rateRange, setRateRange] = useState<[number, number]>([0, 1000])
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 5])
  const [sortBy, setSortBy] = useState<string>("highest-rated")
  const [currentPage, setCurrentPage] = useState(1)

  const MENTORS_PER_PAGE = 8

  // Check authentication and redirect mentors to their dashboard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const sessionData = await response.json()
          if (sessionData?.user?.role === 'mentor') {
            // Redirect mentors to their dashboard
            router.replace('/mentor/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    
    checkAuth()
  }, [router])

  // Fetch mentors from API with enhanced search and category support
  useEffect(() => {
    const fetchMentors = async () => {
      // Don't fetch mentors while checking auth
      if (isCheckingAuth) return
      
      setIsLoading(true)
      try {
        const params = new URLSearchParams()

        // Add search query if present
        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim())
        }

        // Add selected categories if present
        if (selectedCategories.length > 0) {
          params.append("categories", selectedCategories.join(","))
        }

        const url = `/api/find-mentor${params.toString() ? `?${params.toString()}` : ""}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          // Ensure data is an array
          const mentorsArray = Array.isArray(data) ? data : []
          setMentors(mentorsArray)
          setFilteredMentors(mentorsArray)
        } else {
          console.error("Failed to fetch mentors:", response.status, response.statusText)
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
  }, [searchQuery, selectedCategories, isCheckingAuth]) // Re-fetch when search or categories change

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      // Don't fetch categories while checking auth
      if (isCheckingAuth) return
      
      try {
        const response = await fetch("/api/find-mentor/categories")
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
          } else {
          console.error("Failed to fetch categories")
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    fetchCategories()
  }, [isCheckingAuth])

  // Client-side filtering for remaining filters (skills, languages, countries, etc.)
  useEffect(() => {
    if (!Array.isArray(mentors)) {
      setFilteredMentors([])
      return
    }
    
    let filtered = mentors.filter((mentor) => {
      const skills = Array.isArray(mentor.skills) ? mentor.skills : []
      const languages = Array.isArray(mentor.languages) ? mentor.languages : []

      // Skills filter
      const matchesSkills = selectedSkills.length === 0 || selectedSkills.some((skill) => skills.includes(skill))

      // Languages filter
      const matchesLanguages =
        selectedLanguages.length === 0 ||
        selectedLanguages.some((lang) =>
          languages.some((mentorLang) => mentorLang.toLowerCase() === lang.toLowerCase()),
        )

      // Country filter
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(mentor.country)

      // Experience filter
      const matchesExperience = mentor.experience >= experienceRange[0] && mentor.experience <= experienceRange[1]

      // Rate filter
      const matchesRate = mentor.hourlyRate >= rateRange[0] && mentor.hourlyRate <= rateRange[1]

      // Rating filter
      const matchesRating = mentor.rating >= ratingRange[0] && mentor.rating <= ratingRange[1]

      return matchesSkills && matchesLanguages && matchesCountry && matchesExperience && matchesRate && matchesRating
    })

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case "highest-rated":
          return (b.rating || 0) - (a.rating || 0)
        case "lowest-price":
          return (a.hourlyRate || 0) - (b.hourlyRate || 0)
        case "highest-price":
          return (b.hourlyRate || 0) - (a.hourlyRate || 0)
        case "most-experienced":
          return (b.experience || 0) - (a.experience || 0)
        case "most-sessions":
          return (b.reviewCount || 0) - (a.reviewCount || 0)
        default:
          return 0
      }
    })

    setFilteredMentors(filtered)
    setCurrentPage(1)
  }, [mentors, selectedSkills, selectedLanguages, selectedCountries, experienceRange, rateRange, ratingRange, sortBy])

  const totalPages = Math.ceil((filteredMentors || []).length / MENTORS_PER_PAGE)
  const startIndex = (currentPage - 1) * MENTORS_PER_PAGE
  const paginatedMentors = Array.isArray(filteredMentors) ? filteredMentors.slice(startIndex, startIndex + MENTORS_PER_PAGE) : []

  // Extract unique values for filters from current mentors
  const allSkills = Array.isArray(mentors) ? Array.from(
    new Set(mentors.flatMap((mentor) => (Array.isArray(mentor.skills) ? mentor.skills : []))),
  ).filter(Boolean) : []

  const allLanguages = Array.isArray(mentors) ? Array.from(
    new Set(mentors.flatMap((mentor) => (Array.isArray(mentor.languages) ? mentor.languages : []))),
  ).filter(Boolean) : []

  const allCountries = Array.isArray(mentors) ? Array.from(new Set(mentors.map((mentor) => mentor.country))).filter(Boolean) : []

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedSkills([])
    setSelectedLanguages([])
    setSelectedCountries([])
    setSelectedCategories([])
    setExperienceRange([0, 20])
    setRateRange([0, 1000])
    setRatingRange([0, 5])
    setSortBy("highest-rated")
  }

  const hasActiveFilters =
    !!searchQuery ||
    selectedSkills.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedCountries.length > 0 ||
    selectedCategories.length > 0 ||
    experienceRange[0] > 0 ||
    rateRange[0] > 0 ||
    rateRange[1] < 1000 ||
    ratingRange[0] > 0

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

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(
      selectedCategories.includes(categoryId)
        ? selectedCategories.filter((id) => id !== categoryId)
        : [...selectedCategories, categoryId],
    )
  }

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <UnifiedHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <UnifiedHeader />
      <HeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar
          searchQuery={searchQuery}
          selectedSkills={selectedSkills}
          selectedLanguages={selectedLanguages}
          selectedCountries={selectedCountries}
          selectedCategories={selectedCategories}
          experienceRange={experienceRange}
          rateRange={rateRange}
          ratingRange={ratingRange}
          sortBy={sortBy}
          allSkills={allSkills}
          allLanguages={allLanguages}
          allCountries={allCountries}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          handleSkillToggle={handleSkillToggle}
          handleLanguageToggle={handleLanguageToggle}
          handleCountryToggle={handleCountryToggle}
          handleCategoryToggle={handleCategoryToggle}
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
          setCurrentPage={setCurrentPage}
          clearAllFilters={clearAllFilters}
          MENTORS_PER_PAGE={MENTORS_PER_PAGE}
        />
      </div>
    </div>
  )
}
