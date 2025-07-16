"use client"

import type React from "react"

import { useState } from "react"
import SignupLayout from "@/components/signup/SignupLayout"
import SignupHeader from "@/components/signup/SignupHeader"
import StepIndicator from "@/components/signup/StepIndicator"
import LearnerBasicInfo from "@/components/signup/learner/LearnerBasicInfo"
import LearnerGoals from "@/components/signup/learner/LearnerGoals"
import LearnerEmailVerification from "@/components/signup/learner/LearnerEmailVerification";

export default function LearnerSignupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    country: "",
    password: "",
    confirmPassword: "",
    learningGoals: "",
    experienceLevel: "",
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  const totalSteps = 2

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUserEmail(formData.email)
    setIsSubmitted(true)
    console.log("Form submitted:", formData)
  }

  if (isSubmitted) {
    return <LearnerEmailVerification email={userEmail} />
  }

  return (
    <SignupLayout currentStep={currentStep}>
      <SignupHeader />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <LearnerBasicInfo formData={formData} setFormData={setFormData} nextStep={nextStep} />
            )}
            {currentStep === 2 && <LearnerGoals formData={formData} setFormData={setFormData} prevStep={prevStep} />}
          </form>
        </div>
      </div>
    </SignupLayout>
  )
}
