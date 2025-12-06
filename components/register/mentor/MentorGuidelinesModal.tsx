"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Target, BookOpen, Zap } from "lucide-react"

export function MentorGuidelinesModal() {
  const [open, setOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  const steps = [
    {
      number: 1,
      title: "Basic Profile",
      icon: BookOpen,
      description: "Your name, email, country, timezone, and password",
      details: [
        "Create a secure password",
        "Select your timezone for scheduling",
        "Verify your email address",
      ],
    },
    {
      number: 2,
      title: "Professional Background",
      icon: Target,
      description: "Your title, years of experience, bio, and LinkedIn profile",
      details: [
        "Professional title that describes your expertise",
        "Years of experience in your field",
        "Comprehensive bio highlighting your achievements",
        "LinkedIn profile link (optional but recommended)",
      ],
    },
    {
      number: 3,
      title: "Skills & Rates",
      icon: Zap,
      description: "List your expertise areas and set hourly rates",
      details: [
        "Add all skills you're willing to mentor on",
        "Set competitive hourly rates for each skill",
        "Ensure rates reflect your experience level",
      ],
    },
    {
      number: 4,
      title: "Availability & Motivation",
      icon: Clock,
      description: "Define your weekly schedule and mentoring goals",
      details: [
        "Set your weekly availability in your timezone",
        "Explain why you became a freelancer",
        "Share your motivation for mentoring",
        "Highlight your greatest achievement",
      ],
    },
    {
      number: 5,
      title: "Review & Submit",
      icon: CheckCircle2,
      description: "Review your information and agree to terms",
      details: [
        "Review all submitted information",
        "Agree to Terms of Service",
        "Agree to Privacy Policy",
        "Agree to Code of Conduct",
      ],
    },
  ]

  const approvalCriteria = [
    { icon: "🎓", title: "Expertise", description: "Demonstrated knowledge and experience in your skill areas" },
    { icon: "💼", title: "Professionalism", description: "Complete profile with clear communication and realistic rates" },
    { icon: "📅", title: "Availability", description: "Consistent and reasonable availability schedule" },
    { icon: "❤️", title: "Commitment", description: "Clear motivation and passion for mentoring others" },
    { icon: "✓", title: "Compliance", description: "Agreement to our Terms of Service and Code of Conduct" },
  ]

  const currentStep = steps[activeStep - 1]
  const StepIcon = currentStep.icon

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mb-8 border-2 border-blue-200 hover:bg-blue-50">
          📚 How to Become a Mentor - Learn More
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">How to Become a BridgeMentor</DialogTitle>
          <DialogDescription>
            Complete guide to joining our mentor community
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Left Side - Step List */}
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-4">Steps</h3>
            {steps.map((step) => (
              <button
                key={step.number}
                onClick={() => setActiveStep(step.number)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeStep === step.number
                    ? "bg-blue-100 border-2 border-blue-500 text-blue-900"
                    : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={activeStep === step.number ? "default" : "secondary"}
                    className="h-6 w-6 flex items-center justify-center p-0 text-xs"
                  >
                    {step.number}
                  </Badge>
                  <span className="font-medium text-sm">{step.title}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right Side - Step Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Current Step Details */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <StepIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <Badge className="mb-2">Step {currentStep.number} of 5</Badge>
                  <h2 className="text-2xl font-bold text-gray-900">{currentStep.title}</h2>
                  <p className="text-gray-600 mt-1">{currentStep.description}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-gray-900">What you'll need to provide:</h4>
                <ul className="space-y-2">
                  {currentStep.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Approval Criteria */}
            {activeStep === 1 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">✓ What We Look For</h3>
                <div className="grid grid-cols-1 gap-3">
                  {approvalCriteria.map((criteria, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-2xl">{criteria.icon}</span>
                      <div>
                        <p className="font-semibold text-green-900">{criteria.title}</p>
                        <p className="text-sm text-green-800">{criteria.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {activeStep === 1 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">⏱️ Review Timeline</h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 flex-shrink-0">
                      Day 1
                    </Badge>
                    <p className="text-purple-900">You submit your application</p>
                  </div>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 flex-shrink-0">
                      Days 2-3
                    </Badge>
                    <p className="text-purple-900">Our team reviews your profile and credentials</p>
                  </div>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 flex-shrink-0">
                      Days 3-4
                    </Badge>
                    <p className="text-purple-900">You'll receive an approval or feedback email</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
            disabled={activeStep === 1}
          >
            ← Previous
          </Button>
          <Button onClick={() => setOpen(false)} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Got it, Let's Get Started! ✓
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveStep(Math.min(5, activeStep + 1))}
            disabled={activeStep === 5}
          >
            Next →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MentorGuidelinesModal
