"use client"

import type React from "react";
import { useState } from "react";
import StepIndicator from "@/components/register/StepIndicator";
import MentorBasicInfo from "@/components/register/mentor/MentorBasicInfo";
import MentorProfessionalDetails from "@/components/register/mentor/MentorProfessionalDetails";
import MentorSkillsRates from "@/components/register/mentor/MentorSkillsRate";
import MentorAvailability from "@/components/register/mentor/MentorAvailability";
import MentorReviewSubmit from "@/components/register/mentor/MentorReviewSubmit";
import { useRouter } from "next/navigation";
import Header from "@/components/landing/Header";

export default function MentorSignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    profilePicture: null as string | null,
    firstName: "",
    lastName: "",
    email: "",
    gender: "",
    languages: [] as string[],
    password: "",
    confirmPassword: "",
    country: "",
    timezone: "",

    // Step 2: Professional Details
    professionalTitle: "",
    bio: "",
    yearsOfExperience: "",
    linkedinUrl: "",
    linkAttachments: [] as string[],

    // Step 3: Skills & Rates
    skills: [] as Array<{ name: string; rate: number }>,

    // Step 4: Availability & Goals
    availability: {} as Record<string, { id: string; start: string; end: string }[]>,
    whyFreelancer: "",
    whyMentor: "",
    greatestAchievement: "",
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    const res = await fetch("/api/register/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      setUserEmail(formData.email);
      setIsSubmitted(true);
      router.push("/");
    } else {
      const errorData = await res.json();
      alert(errorData.error || "Something went wrong");
    }
  } catch (err) {
    console.error("Submission error:", err);
    alert("Something went wrong. Please try again.");
  } finally {
    setIsSubmitting(false)
  }
}

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
                <MentorReviewSubmit formData={formData} setFormData={setFormData} prevStep={prevStep} isSubmitting={isSubmitting} />
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
