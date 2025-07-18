"use client"

import type React from "react";
import { useState, useEffect } from "react";
import StepIndicator from "@/components/signup/StepIndicator";
import MentorBasicInfo from "@/components/signup/mentor/MentorBasicInfo";
import MentorProfessionalDetails from "@/components/signup/mentor/MentorProfessionalDetails";
import MentorSkillsRates from "@/components/signup/mentor/MentorSkillsRate";
import MentorAvailability from "@/components/signup/mentor/MentorAvailability";
import MentorReviewSubmit from "@/components/signup/mentor/MentorReviewSubmit";
import { useRouter } from "next/navigation";
import Header from "@/components/landing/Header";

export default function MentorSignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    profilePicture: null as File | null,
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    timezone: "",

    // Step 2: Professional Details
    professionalTitle: "",
    bio: "",
    yearsOfExperience: "",
    linkedinUrl: "",
    portfolioUrl: "",

    // Step 3: Skills & Rates
    skills: [] as Array<{ name: string; rate: number }>,

    // Step 4: Availability & Goals
    availability: [] as string[],
    whyFreelancer: "",
    whyMentor: "",
    greatestAchievement: "",
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  const totalSteps = 5

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }
  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUserEmail(formData.email)
    setIsSubmitted(true)
    console.log("Mentor application submitted:", formData)
  }

    useEffect(() => {
        if (isSubmitted) {
            router.push("/")
        }
    }, [isSubmitted])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} isMentor={true} />

          <div className="backdrop-blur-sm p-8 pl-0 lg:pl-1">
            <form onSubmit={handleSubmit} className="space-y-8">
              {currentStep === 1 && (
                <MentorBasicInfo formData={formData} setFormData={updateFormData} nextStep={nextStep} />
              )}
              {currentStep === 2 && (
                <MentorProfessionalDetails
                  formData={formData}
                  setFormData={setFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              )}
              {currentStep === 3 && (
                <MentorSkillsRates
                  formData={formData}
                  setFormData={setFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              )}
              {currentStep === 4 && (
                <MentorAvailability
                  formData={formData}
                  setFormData={setFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                />
              )}
              {currentStep === 5 && (
                <MentorReviewSubmit formData={formData} setFormData={setFormData} prevStep={prevStep} />
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
