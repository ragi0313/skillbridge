import SignupCard from "./SignupCard";
import { Users, GraduationCap } from "lucide-react";

export default function SignupOptions() {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16 px-4">
      <SignupCard
        title="I'm a Learner"
        description="Accelerate your growth with expert mentorship"
        features={[
          "Basic Information (name, email, location)",
          "Set your timezone for convenient scheduling",
          "Define your learning goals and experience level",
          "2-step verification process"
        ]}
        icon={GraduationCap}
        gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
      />
      <SignupCard
        title="I'm a Freelancer"
        description="Share your expertise and build your network"
        features={[
          "Basic Profile (name, email, location, languages)",
          "Professional Background (title, experience, bio, LinkedIn)",
          "Skills & Hourly Rates for each skill",
          "Weekly Availability Schedule & Career Motivation"
        ]}
        icon={Users}
        gradient="bg-gradient-to-r from-purple-500 to-pink-500"
      />
    </div>
  )
}