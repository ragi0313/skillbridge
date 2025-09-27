"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ChevronDown, X } from "lucide-react"

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm font-medium text-gray-700">Filter by:</span>

        {/* Categories Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white rounded-lg text-sm font-medium transition-colors"
            >
              {selectedCategories.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-700 text-xs">
                  {selectedCategories.length}
                </Badge>
              ) : null}
              Categories
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 rounded-lg shadow-lg border z-50">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 text-sm">Select Categories</h4>
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
              className="h-10 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white rounded-lg text-sm font-medium transition-colors"
            >
              {selectedSkills.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-700 text-xs">
                  {selectedSkills.length}
                </Badge>
              ) : null}
              Skills
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 rounded-lg shadow-lg border z-50">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 text-sm">Select Skills</h4>
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
              className="h-10 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white rounded-lg text-sm font-medium transition-colors"
            >
              {rateRange[1] < 1000 ? (
                `≤ ${rateRange[1]} credits`
              ) : (
                "Price"
              )}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-6 rounded-lg shadow-lg border z-50">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">Maximum Price</h4>
                <p className="text-xs text-gray-500 mb-3">Show mentors up to this price</p>
              </div>

              {/* Current Selection Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-900">
                    {rateRange[1] === 1000 ? 'Any Price' : `≤ ${rateRange[1]} credits`}
                  </div>
                  {rateRange[1] < 1000 && (
                    <div className="text-sm text-blue-700">
                      ≤ ₱{(rateRange[1] * 25).toLocaleString()} per session
                    </div>
                  )}
                </div>
              </div>

              {/* Range Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Adjust price limit</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRateRange([0, 1000])}
                    className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
                  >
                    Reset
                  </Button>
                </div>
                <div className="px-2">
                  <Slider
                    value={[rateRange[1]]}
                    onValueChange={(value) => setRateRange([0, value[0]])}
                    max={1000}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0 credits</span>
                    <span>1000+ credits</span>
                  </div>
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
              className="h-10 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white rounded-lg text-sm font-medium transition-colors"
            >
              {selectedLanguages.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-700 text-xs">
                  {selectedLanguages.length}
                </Badge>
              ) : null}
              Languages
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 rounded-lg shadow-lg border z-50">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 text-sm">Select Languages</h4>
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

        {/* More Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              More
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-6 rounded-lg shadow-lg border z-50">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Advanced Filters
              </h3>

              <div className="grid grid-cols-2 gap-6">
                {/* Countries Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">
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
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">
                    Minimum Experience
                  </Label>
                  <div className="space-y-6">
                    <div className="px-3">
                      <Slider
                        value={[experienceRange[1]]}
                        onValueChange={(value) => setExperienceRange([0, value[0]])}
                        max={20}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600 mt-3 font-medium">
                        <span>0 years</span>
                        <span>{experienceRange[1]}+ years minimum</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Rating Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">
                    Minimum Rating
                  </Label>
                  <div className="space-y-6">
                    <div className="px-3">
                      <Slider
                        value={[ratingRange[1]]}
                        onValueChange={(value) => setRatingRange([0, value[0]])}
                        max={5}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600 mt-3 font-medium">
                        <span>0.0⭐</span>
                        <span>{ratingRange[1].toFixed(1)}⭐+ minimum</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-10 border border-gray-300 hover:border-gray-400 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg z-50">
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
              <SelectItem value="lowest-price">Lowest Price</SelectItem>
              <SelectItem value="highest-price">Highest Price</SelectItem>
              <SelectItem value="most-experienced">Most Experienced</SelectItem>
              <SelectItem value="most-sessions">Most Sessions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Price Range Filter */}
            {rateRange[1] < 1000 && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-lg text-xs font-medium">
                Price: ≤{rateRange[1]} credits (≤₱{(rateRange[1] * 25).toLocaleString()})
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-purple-900 transition-colors"
                  onClick={() => setRateRange([0, 1000])}
                />
              </Badge>
            )}

            {/* Experience Range Filter */}
            {experienceRange[1] > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 rounded-lg text-xs font-medium">
                Experience: {experienceRange[1]}+ years
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-orange-900 transition-colors"
                  onClick={() => setExperienceRange([0, 0])}
                />
              </Badge>
            )}

            {/* Rating Range Filter */}
            {ratingRange[1] > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1 rounded-lg text-xs font-medium">
                Rating: {ratingRange[1].toFixed(1)}+ stars
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-yellow-900 transition-colors"
                  onClick={() => setRatingRange([0, 0])}
                />
              </Badge>
            )}

            {selectedCategories.map((categoryId) => {
              const category = categories?.find((c) => c.id.toString() === categoryId)
              return category ? (
                <Badge
                  key={categoryId}
                  className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-lg text-xs font-medium"
                >
                  {category.name}
                  <X
                    className="ml-2 h-3 w-3 cursor-pointer hover:text-blue-900 transition-colors"
                    onClick={() => handleCategoryToggle(categoryId)}
                  />
                </Badge>
              ) : null
            })}
            {selectedSkills.map((skill) => (
              <Badge
                key={skill}
                className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-lg text-xs font-medium"
              >
                {skill}
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-blue-900 transition-colors"
                  onClick={() => handleSkillToggle(skill)}
                />
              </Badge>
            ))}
            {selectedLanguages.map((language) => (
              <Badge
                key={language}
                className="bg-green-100 text-green-700 border-green-200 px-3 py-1 rounded-lg text-xs font-medium"
              >
                {language}
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-green-900 transition-colors"
                  onClick={() => handleLanguageToggle(language)}
                />
              </Badge>
            ))}
            {selectedCountries.map((country) => (
              <Badge
                key={country}
                className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1 rounded-lg text-xs font-medium"
              >
                {country}
                <X
                  className="ml-2 h-3 w-3 cursor-pointer hover:text-gray-900 transition-colors"
                  onClick={() => handleCountryToggle(country)}
                />
              </Badge>
            ))}

            {/* Clear All Button alongside other filters */}
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="px-3 py-1 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors h-auto"
            >
              <X className="mr-1 h-3 w-3" />
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
