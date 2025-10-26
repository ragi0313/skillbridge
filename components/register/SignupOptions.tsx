import SignupCard from "./SignupCard";
import { Users, GraduationCap } from "lucide-react";

export default function SignupOptions() {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16 px-4">
      <SignupCard
        title="I'm a Learner"
        description="Accelerate your growth with expert mentorship"
        features={[
          "Book verified freelancing experts",
          "Learn through personalized 1-on-1 sessions",
          "Explore diverse skill categories",
          "Build confidence to land your first client"
        ]}
        icon={GraduationCap}
        gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
      />
      <SignupCard
        title="I'm a Freelancer"
        description="Share your expertise and build your network"
        features={[
          "Monetize your expertise",
          "Set your own rates",
          "Mentor at your own pace and time",
          "Expand your professional network"
        ]}
        icon={Users}
        gradient="bg-gradient-to-r from-purple-500 to-pink-500"
      />
    </div>
  )
}