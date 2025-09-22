"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"

interface SuccessStory {
  id: number
  quote: string
  author: string
  role: string
  image: string
  rating: number
  mostValuable?: string
  createdAt: string
  mentorContext: string
  learnerCountry: string
}

interface SuccessStoriesResponse {
  success: boolean
  stories: SuccessStory[]
  count: number
  message?: string
}

export function SuccessStoriesSection() {
  const [stories, setStories] = useState<SuccessStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSuccessStories() {
      try {
        const response = await fetch("/api/success-stories?limit=12")
        const data: SuccessStoriesResponse = await response.json()

        if (data.success && data.stories.length > 0) {
          setStories(data.stories)
        }
      } catch (err) {
        console.error("Failed to fetch success stories:", err)
        setError("Failed to load success stories")
      } finally {
        setLoading(false)
      }
    }

    fetchSuccessStories()
  }, [])

  // Don't render the section if no stories are available
  if (loading) {
    return null // Could add a loading skeleton here if needed
  }

  if (error || stories.length === 0) {
    return null // Hide the section completely if no data
  }
  return (
    <section className="py-20 bg-muted/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Success Stories</h2>
          <p className="text-xl text-muted-foreground">Real results from real mentorship</p>
        </div>

        <div className="relative">
          <div className="flex animate-scroll-left space-x-6">
            {/* First set of stories */}
            {stories.map((story, index) => (
              <Card key={story.id} className="flex-shrink-0 w-80 p-6">
                <div className="flex items-center justify-center mb-4">
                  <img
                    src={story.image || "/default-avatar.png"}
                    alt={story.author}
                    className="w-16 h-16 object-cover rounded-full"
                  />
                </div>

                <div className="flex justify-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < story.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                <blockquote className="text-muted-foreground mb-4 italic text-center min-h-[80px] text-sm">
                  "{story.quote}"
                </blockquote>

                <div className="text-center">
                  <div className="font-semibold text-sm">{story.author}</div>
                  <div className="text-xs text-muted-foreground">{story.role}</div>
                  <div className="text-xs text-gray-500 mt-1">{story.mentorContext}</div>
                  {story.mostValuable && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      "{story.mostValuable.slice(0, 40)}..."
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {/* Duplicate set for seamless loop */}
            {stories.map((story, index) => (
              <Card key={`duplicate-${story.id}`} className="flex-shrink-0 w-80 p-6">
                <div className="flex items-center justify-center mb-4">
                  <img
                    src={story.image || "/default-avatar.png"}
                    alt={story.author}
                    className="w-16 h-16 object-cover rounded-full"
                  />
                </div>

                <div className="flex justify-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < story.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                <blockquote className="text-muted-foreground mb-4 italic text-center min-h-[80px] text-sm">
                  "{story.quote}"
                </blockquote>

                <div className="text-center">
                  <div className="font-semibold text-sm">{story.author}</div>
                  <div className="text-xs text-muted-foreground">{story.role}</div>
                  <div className="text-xs text-gray-500 mt-1">{story.mentorContext}</div>
                  {story.mostValuable && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      "{story.mostValuable.slice(0, 40)}..."
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
