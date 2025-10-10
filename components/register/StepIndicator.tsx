import { Progress } from "@/components/ui/progress"

const stepInfo = [
  ["Create your account", "Join thousands of learners accelerating their careers with expert mentorship"],
  ["Tell us about your goals", "Help us personalize your learning experience"],
]

const mentorStepInfo = [
  ["Basic Information", "Let's start with your personal details"],
  ["Professional Background", "Tell us about your expertise and experience"],
  ["Skills & Pricing", "Set your skills and hourly rates"],
  ["Availability & Goals", "Share your availability and motivations"],
  ["Review & Submit", "Review your application before submitting"],
]

export default function StepIndicator({
  currentStep,
  totalSteps,
  isMentor = false,
}: {
  currentStep: number
  totalSteps: number
  isMentor?: boolean
}) {
  const progress = ((currentStep - 1) / totalSteps) * 100
  const stepData = isMentor ? mentorStepInfo : stepInfo
  const [title, subtitle] = stepData[currentStep - 1] || ["Step", ""]

  return (
    <div className="mb-8 mt-10 lg:mt-0">
      <h1 className="font-extrabold mb-8 text-4xl">{isMentor ? "Become a mentor" : "Sign up as a learner"}</h1>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-400">{Math.round(progress)}% Complete</span>
      </div>
      <Progress value={progress} className="h-2 mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-lg">{subtitle}</p>
    </div>
  )
}
