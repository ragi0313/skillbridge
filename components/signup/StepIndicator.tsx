import { Progress } from "@/components/ui/progress"

const stepInfo = [
  ["Create your account", "Join thousands of learners accelerating their careers with expert mentorship"],
  ["Tell us about your goals", "Help us personalize your learning experience"],
]

export default function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  const progress = (currentStep / totalSteps) * 100
  const [title, subtitle] = stepInfo[currentStep - 1] || ["Step", ""]

  return (
    <div className="mb-8 mt-10 lg:mt-0">
      <h1 className="font-extrabold mb-8 text-4xl">Sign up as a learner</h1>
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
