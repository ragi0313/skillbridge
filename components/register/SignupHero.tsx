import { Badge } from "@/components/ui/badge"

export default function SignupHero() {
  return (
    <div className="text-center mb-16 pt-16">
      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
        Choose Your
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          {" "}Journey
        </span>
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        Whether you're here to learn from experts or share your knowledge, we've got the perfect path for you.
      </p>
    </div>
  )
}
