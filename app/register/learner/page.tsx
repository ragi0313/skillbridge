"use client"

import type React from "react"

import { useState } from "react"
import SignupLayout from "@/components/register/SignupLayout"
import SignupHeader from "@/components/register/SignupHeader"
import StepIndicator from "@/components/register/StepIndicator"
import LearnerBasicInfo from "@/components/register/learner/LearnerBasicInfo"
import LearnerGoals from "@/components/register/learner/LearnerGoals"
import LearnerEmailVerification from "@/components/register/learner/LearnerEmailVerification";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/register/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setUserEmail(formData.email)
        setIsSubmitted(true)
      } else {
        alert(data.error || "Registration failed")
      }
    } catch (error) {
      console.error("Error registering:", error)
      alert("Registration failed. Please try again.")
    }
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
