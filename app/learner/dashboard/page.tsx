"use client"

import HeroSection from "@/components/learner/HeroSection"
import RecommendedMentors from "@/components/learner/RecommendedMentors"
import FAQSection from "@/components/learner/FAQSection"
import Header from "@/components/learner/Header"
import Footer from "@/components/landing/Footer"


export default function LearnerDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <Header />
      {/* Main Content */}
      <main className="">
        {" "}
        {/* Account for sticky header */}
        {/* Hero Section */}
        <HeroSection />
        {/* Recommended Mentors */}
        <RecommendedMentors  />
        {/* FAQ Section */}
        <FAQSection />
        <Footer />
      </main>
    </div>
  )
}
