import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export default function SignupCard({
  title,
  description,
  features,
  icon: Icon,
  gradient,
}: {
  title: string
  description: string
  features: string[]
  icon: LucideIcon
  gradient: string
}) {
  const isLearner = title.includes("Learner")
  const destination = isLearner ? "/register/learner" : "/register/mentor"

  return (
    <div className="group relative">
      <div className={`absolute -inset-1 ${gradient} rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200`} />
      <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="text-center mb-6">
          <div className={`w-20 h-20 ${gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>

        <div className="space-y-4 mb-8">
          {features.map((f, i) => (
            <div className="flex items-center space-x-3" key={i}>
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-700 font-medium">{f}</span>
            </div>
          ))}
        </div>

        <Link href={destination}>
          <Button
            className={`w-full ${gradient} hover:brightness-110 text-white font-semibold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 flex items-center justify-center gap-2`}
          >
            {isLearner ? "Start Learning" : "Start Teaching"}
            <ArrowRight className="w-5 h-5 mt-1 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
