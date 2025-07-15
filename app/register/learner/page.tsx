"use client"

import { useState } from "react";
import SignupLayout from "@/components/signup/SignupLayout";
import SignupHeader from "@/components/signup/SignupHeader";
import StepIndicator from "@/components/signup/StepIndicator";
import LearnerBasicInfo from "@/components/signup/LearnerBasicInfo";
import LearnerGoals from "@/components/signup/LearnerGoals";

export default function LearnerSignupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    learningGoals: "",
    experienceLevel: "",
  })

  const totalSteps = 2

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
  }

  return (
    <SignupLayout currentStep={currentStep}>
      <SignupHeader />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <LearnerBasicInfo
                formData={formData}
                setFormData={setFormData}
                nextStep={nextStep}
              />
            )}
            {currentStep === 2 && (
              <LearnerGoals
                formData={formData}
                setFormData={setFormData}
                prevStep={prevStep}
              />
            )}
          </form>
        </div>
      </div>
    </SignupLayout>
  )
}
