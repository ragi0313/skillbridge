import Image from "next/image";
import { ReactNode } from "react";
import Logo from "../ui/logo";

export default function SignupLayout({ currentStep, children }: { currentStep: number; children: ReactNode }) {
  return (
    <div className="min-h-screen-stable bg-gray-50 flex flex-col lg:flex-row lg:overflow-hidden">
      <div className="hidden lg:block lg:w-1/2 lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:h-screen relative">

        <Image
          src="/learner-bg.jpg"
          alt="Mentorship and growth concept"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
      </div>
      <div className="w-full lg:w-1/2 lg:ml-auto flex flex-col min-h-screen-stable lg:h-screen lg:overflow-y-auto">
        {children}
      </div>
    </div>
  )
}