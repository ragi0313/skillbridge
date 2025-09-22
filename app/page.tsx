import { Header } from "@/components/landing/Header"
import { HeroSection } from "@/components/landing/HeroSection"
import { WhyLearnSection } from "@/components/landing/whyLearnSection"
import { HowItWorksSection } from "@/components/landing/howItWorksSection"
import { EarnWhileTeachSection } from "@/components/landing/earnWhileTeachSection"
import { SuccessStoriesSection } from "@/components/landing/successStoriesSection"
import { StartJourneySection } from "@/components/landing/startJourneySection"
import { Footer } from "@/components/landing/Footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <WhyLearnSection />
        <HowItWorksSection />
        <EarnWhileTeachSection />
        <SuccessStoriesSection />
        <StartJourneySection />
      </main>
      <Footer />
    </div>
  )
}
