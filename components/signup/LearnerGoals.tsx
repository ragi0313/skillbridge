import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle } from "lucide-react"

const experienceLevels = [
  { label: "Complete Beginner", value: "beginner" },
  { label: "Some Experience", value: "intermediate" },
  { label: "Experienced", value: "advanced" },
]

export default function LearnerGoals({ formData, setFormData, prevStep }: any) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="experienceLevel" className="text-sm font-semibold text-gray-700 mb-2 block">
          Current Experience Level*
        </Label>
        <Select onValueChange={(value) => setFormData({ ...formData, experienceLevel: value })}>
          <SelectTrigger className="w-full h-14 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm">
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            {experienceLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="learningGoals" className="text-sm font-semibold text-gray-700 mb-2 block">
          Learning Goals & Objectives*
        </Label>
        <Textarea
          id="learningGoals"
          placeholder="Describe what you want to achieve, specific areas you want to focus on, and your timeline."
          value={formData.learningGoals}
          onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
          rows={7}
          className="w-full h-30 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none"
          required
        />
      </div>

      <div className="space-y-4 pt-6 border-t border-gray-200">
        <div className="flex items-start space-x-3">
          <Checkbox id="terms" required className="mt-1" />
          <Label htmlFor="terms" className="text-sm leading-relaxed text-gray-600">
            I agree to the{" "}
            <a href="/terms" className="text-blue-600 hover:text-blue-700 font-semibold">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-semibold">
              Privacy Policy
            </a>
          </Label>
        </div>
        <div className="flex items-start space-x-3">
          <Checkbox id="marketing" className="mt-1" />
          <Label htmlFor="marketing" className="text-sm leading-relaxed text-gray-600">
            I'd like to receive updates about new mentors, platform features, and learning opportunities
          </Label>
        </div>
      </div>

      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="flex-1 h-14 text-base border-gray-200 bg-transparent hover:bg-gray-50 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Previous
        </Button>
        <Button
          type="submit"
          className="flex-1 h-14 gradient-skillbridge text-white font-semibold text-base rounded-lg transition-all"
        >
          Create Account
          <CheckCircle className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
