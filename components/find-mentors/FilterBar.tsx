"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Filter, ChevronDown, X, Star, DollarSign, Award, Globe, Users, Languages, Layers } from "lucide-react"

interface CategoryWithCount {
  id: number
  name: string
  description?: string
  mentorCount: number
  skills: string[]
}

interface FilterBarProps {
  searchQuery: string
  selectedSkills: string[]
  selectedLanguages: string[]
  selectedCountries: string[]
  selectedCategories: string[]
  experienceRange: [number, number]
  rateRange: [number, number]
  ratingRange: [number, number]
  sortBy: string
  allSkills: string[]
  allLanguages: string[]
  allCountries: string[]
  categories: CategoryWithCount[]
  hasActiveFilters: boolean
  handleSkillToggle: (skill: string) => void
  handleLanguageToggle: (language: string) => void
  handleCountryToggle: (country: string) => void
  handleCategoryToggle: (categoryId: string) => void
  setExperienceRange: (range: [number, number]) => void
  setRateRange: (range: [number, number]) => void
  setRatingRange: (range: [number, number]) => void
  setSortBy: (sort: string) => void
  clearAllFilters: () => void
}

export function FilterBar({
  selectedSkills,
  selectedLanguages,
  selectedCountries,
  selectedCategories,
  experienceRange,
  rateRange,
  ratingRange,
  sortBy,
  allSkills = [],
  allLanguages = [],
  allCountries = [],
  categories = [],
  hasActiveFilters,
  handleSkillToggle,
  handleLanguageToggle,
  handleCountryToggle,
  handleCategoryToggle,
  setExperienceRange,
  setRateRange,
  setRatingRange,
  setSortBy,
  clearAllFilters,
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 pb-2 mb-8 relative z-10">
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Filter className="h-5 w-5 text-purple-600" />
          </div>
          <span className="text-lg font-semibold text-gray-800">Filters:</span>
        </div>

        {/* Categories Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white rounded-xl font-medium transition-all duration-200"
            >
              <Layers className="mr-2 h-4 w-4 text-purple-500" />
              {selectedCategories.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-purple-100 text-purple-700">
                  {selectedCategories.length}
                </Badge>
              ) : null}
              Categories
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-6 rounded-2xl shadow-xl border-0 z-50">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 mb-4">Select Categories</h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {categories && categories.length > 0 ? (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id.toString())}
                          onCheckedChange={() => handleCategoryToggle(category.id.toString())}
                          className="border-2"
                        />
                        <div>
                          <Label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer font-medium">
                            {category.name}
                          </Label>
                          {category.description && <p className="text-xs text-gray-500 mt-1">{category.description}</p>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {category.mentorCount}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">No categories available</div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Skills Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white rounded-xl font-medium transition-all duration-200"
            >
              <Award className="mr-2 h-4 w-4 text-purple-500" />
              {selectedSkills.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-purple-100 text-purple-700">
                  {selectedSkills.length}
                </Badge>
              ) : null}
              All Skills
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-6 rounded-2xl shadow-xl border-0 z-50">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 mb-4">Select Skills</h4>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {allSkills && allSkills.length > 0 ? (
                  allSkills.map((skill) => (
                    <div key={skill} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <Checkbox
                        id={`skill-${skill}`}
                        checked={selectedSkills.includes(skill)}
                        onCheckedChange={() => handleSkillToggle(skill)}
                        className="border-2"
                      />
                      <Label htmlFor={`skill-${skill}`} className="text-sm cursor-pointer font-medium">
                        {skill}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4 col-span-2">No skills available</div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Price Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white rounded-xl font-medium transition-all duration-200"
            >
              <DollarSign className="mr-2 h-4 w-4 text-green-500" />
              {rateRange[0] > 0 || rateRange[1] < 200 ? `${rateRange[0]}-${rateRange[1]} credits` : "All Prices"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-6 rounded-2xl shadow-xl border-0 z-50">
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-800">Credit Range</h4>
              <div className="px-2">
                <Slider
                  value={rateRange}
                  onValueChange={(value) => setRateRange(value as [number, number])}
                  max={200}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-3">
                  <span className="font-medium">{rateRange[0]} credits</span>
                  <span className="font-medium">{rateRange[1]}+ credits</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Languages Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white rounded-xl font-medium transition-all duration-200"
            >
              <Languages className="mr-2 h-4 w-4 text-blue-500" />
              {selectedLanguages.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-700">
                  {selectedLanguages.length}
                </Badge>
              ) : null}
              Languages
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-6 rounded-2xl shadow-xl border-0 z-50">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 mb-4">Select Languages</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allLanguages && allLanguages.length > 0 ? (
                  allLanguages.map((language) => (
                    <div key={language} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <Checkbox
                        id={`language-${language}`}
                        checked={selectedLanguages.includes(language)}
                        onCheckedChange={() => handleLanguageToggle(language)}
                        className="border-2"
                      />
                      <Label htmlFor={`language-${language}`} className="text-sm cursor-pointer font-medium">
                        {language}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">No languages available</div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* More Filters - Now as Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-xl font-medium transition-all duration-200 bg-transparent"
            >
              <Filter className="mr-2 h-4 w-4 text-gray-500" />
              More Filters
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] p-8 rounded-2xl shadow-xl border-0 z-50">
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Filter className="h-5 w-5 text-purple-600" />
                </div>
                Advanced Filters
              </h3>

              <div className="grid grid-cols-2 gap-8">
                {/* Countries Filter */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    Country
                  </Label>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {allCountries && allCountries.length > 0 ? (
                      allCountries.map((country) => (
                        <div
                          key={country}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Checkbox
                            id={`country-${country}`}
                            checked={selectedCountries.includes(country)}
                            onCheckedChange={() => handleCountryToggle(country)}
                            className="border-2 border-gray-300"
                          />
                          <Label
                            htmlFor={`country-${country}`}
                            className="text-sm cursor-pointer font-medium text-gray-700"
                          >
                            {country}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">No countries available</div>
                    )}
                  </div>
                </div>

                {/* Experience Range */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Award className="h-4 w-4 text-purple-600" />
                    </div>
                    Experience
                  </Label>
                  <div className="space-y-6">
                    <div className="px-3">
                      <Slider
                        value={experienceRange}
                        onValueChange={(value) => setExperienceRange(value as [number, number])}
                        max={20}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600 mt-3 font-medium">
                        <span>{experienceRange[0]} years</span>
                        <span>{experienceRange[1]}+ years</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Rating Range */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Star className="h-4 w-4 text-yellow-600" />
                    </div>
                    Minimum Rating
                  </Label>
                  <div className="space-y-6">
                    <div className="px-3">
                      <Slider
                        value={ratingRange}
                        onValueChange={(value) => setRatingRange(value as [number, number])}
                        max={5}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600 mt-3 font-medium">
                        <span>{ratingRange[0].toFixed(1)}⭐</span>
                        <span>{ratingRange[1].toFixed(1)}⭐</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="flex justify-center pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="px-8 py-3 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl font-semibold transition-all duration-200 bg-white shadow-sm"
                  >
                    <X className="mr-2 h-5 w-5" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-56 h-12 border-2 border-gray-200 hover:border-purple-300 rounded-xl font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl z-50">
              <SelectItem value="highest-rated">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Highest Rated
                </div>
              </SelectItem>
              <SelectItem value="lowest-price">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Lowest Price
                </div>
              </SelectItem>
              <SelectItem value="highest-price">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-red-500" />
                  Highest Price
                </div>
              </SelectItem>
              <SelectItem value="most-experienced">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  Most Experienced
                </div>
              </SelectItem>
              <SelectItem value="most-sessions">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Most Sessions
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="border-t border-gray-100 pt-6 mt-6">
          <div className="flex flex-wrap gap-3">
            {selectedCategories.map((categoryId) => {
              const category = categories?.find((c) => c.id.toString() === categoryId)
              return category ? (
                <Badge
                  key={categoryId}
                  className="bg-purple-100 text-purple-700 border-purple-200 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {category.name}
                  <X
                    className="ml-2 h-4 w-4 cursor-pointer hover:text-purple-900 transition-colors"
                    onClick={() => handleCategoryToggle(categoryId)}
                  />
                </Badge>
              ) : null
            })}
            {selectedSkills.map((skill) => (
              <Badge
                key={skill}
                className="bg-purple-100 text-purple-700 border-purple-200 px-4 py-2 rounded-full text-sm font-medium"
              >
                {skill}
                <X
                  className="ml-2 h-4 w-4 cursor-pointer hover:text-purple-900 transition-colors"
                  onClick={() => handleSkillToggle(skill)}
                />
              </Badge>
            ))}
            {selectedLanguages.map((language) => (
              <Badge
                key={language}
                className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-2 rounded-full text-sm font-medium"
              >
                {language}
                <X
                  className="ml-2 h-4 w-4 cursor-pointer hover:text-blue-900 transition-colors"
                  onClick={() => handleLanguageToggle(language)}
                />
              </Badge>
            ))}
            {selectedCountries.map((country) => (
              <Badge
                key={country}
                className="bg-green-100 text-green-700 border-green-200 px-4 py-2 rounded-full text-sm font-medium"
              >
                {country}
                <X
                  className="ml-2 h-4 w-4 cursor-pointer hover:text-green-900 transition-colors"
                  onClick={() => handleCountryToggle(country)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
