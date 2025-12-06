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
import { Header } from "@/components/landing/Header";
import { toast } from "sonner";

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
  setIsSubmitting(true)

  try {
    const res = await fetch("/api/auth/register/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      setUserEmail(formData.email);
      setIsSubmitted(true);
      toast.success("Registration successful! Welcome to BridgeMentor!");
      router.push("/");
    } else {
      const errorData = await res.json();
      toast.error(errorData.error || "Something went wrong");
    }
  } catch (err) {
    console.error("Submission error:", err);
    toast.error("Something went wrong. Please try again.");
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

          {/* Mentor Requirements Card */}
          {currentStep === 1 && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">🎓 How to Become a Mentor</h3>
              <p className="text-sm text-blue-800 mb-4">
                To join our mentor community, you'll need to complete 5 steps and provide the following information:
              </p>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span><strong>Basic Profile:</strong> Your name, email, country, timezone, and password</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span><strong>Professional Background:</strong> Your title, years of experience, bio, and LinkedIn profile (optional)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span><strong>Skills & Rates:</strong> List your expertise areas and set hourly rates for each skill</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span><strong>Availability:</strong> Define your weekly availability schedule and explain your mentoring motivation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">5.</span>
                  <span><strong>Review & Submit:</strong> Review your information and agree to our terms and code of conduct</span>
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-4 italic">
                ✓ Your application will be reviewed by our team and you'll be notified within 2-3 business days
              </p>
            </div>
          )}

          <div className="backdrop-blur-sm p-8 pl-0 lg:pl-1">
            <form onSubmit={handleSubmit} className="space-y-8">
              {currentStep === 1 && (
                <MentorBasicInfo formData={formData} setFormData={updateFormData} nextStep={nextStep} isSettingsPage={false} />
              )}
              {currentStep === 2 && (
                <MentorProfessionalDetails
                  formData={formData}
                  setFormData={setFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  isSettingsPage={false}
                />
              )}
              {currentStep === 3 && (
                <MentorSkillsRates
                  formData={formData}
                  setFormData={setFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  isSettingsPage={false}
                />
              )}
              {currentStep === 4 && (
                <MentorAvailability
                  formData={formData}
                  setFormData={setFormData}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  isSettingsPage={false}
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
