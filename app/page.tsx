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
