"use client"

import HeroSection from "@/components/learner/HeroSection"
import RecommendedMentors from "@/components/learner/RecommendedMentors"
import FAQSection from "@/components/learner/FAQSection"
import { LearnerHeader } from "@/components/learner/Header"
import Footer from "@/components/landing/Footer"


export default function LearnerDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LearnerHeader />
      <main className="">
        {" "}
        <HeroSection />
        <RecommendedMentors  />
        <FAQSection />
        <Footer />
      </main>
    </div>
  )
}
