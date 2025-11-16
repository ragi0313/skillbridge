'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from "@/components/landing/Header"
import { HeroSectionAnimated } from "@/components/landing/HeroSectionAnimated"
import { StatsSectionWithImages } from "@/components/landing/statsSectionWithImages"
import { WhyLearnSection } from "@/components/landing/whyLearnSection"
import { SkillCategoriesSectionWithImages } from "@/components/landing/skillCategoriesSectionWithImages"
import { HowItWorksSection } from "@/components/landing/howItWorksSection"
import { FeaturedMentorsSection } from "@/components/landing/featuredMentorsSection"
import { PlatformBenefitsSectionWithImages } from "@/components/landing/platformBenefitsSectionWithImages"
import { EarnWhileTeachSection } from "@/components/landing/earnWhileTeachSection"
import { SuccessStoriesSection } from "@/components/landing/successStoriesSection"
import { CTABannerSection } from "@/components/landing/ctaBannerSection"
import { FAQSection } from "@/components/landing/faqSection"
import { StartJourneySection } from "@/components/landing/startJourneySection"
import { Footer } from "@/components/landing/Footer"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Client-side check to redirect logged-in users
    // This is a safety net in case middleware doesn't catch it
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.session && data.session.role) {
            const role = data.session.role
            const redirectPath = role === 'admin' ? `/${role}/dashboard` : `/${role}`
            router.replace(redirectPath)
          }
        }
      } catch (error) {
        // If auth check fails, just show the landing page
        console.log('Auth check failed, showing landing page')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSectionAnimated />
        <StatsSectionWithImages />
        <WhyLearnSection />
        <SkillCategoriesSectionWithImages />
        <HowItWorksSection />
        <FeaturedMentorsSection />
        <PlatformBenefitsSectionWithImages />
        <EarnWhileTeachSection />
        <SuccessStoriesSection />
        <CTABannerSection />
        <FAQSection />
        <StartJourneySection />
      </main>
      <Footer />
    </div>
  )
}
