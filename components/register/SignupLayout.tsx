import Image from "next/image";
import { ReactNode } from "react";
import Logo from "../ui/logo";

export default function SignupLayout({ currentStep, children }: { currentStep: number; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left side - Fixed background image */}
      <div className="hidden lg:flex lg:w-1/2 lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-hidden">
        <div className="relative w-full h-full">
          <div className="absolute top-6 left-8 z-10">
            <Logo imageWidth={40} imageHeight={40} fontSize="text-2xl" />
          </div>
          <Image
            src="/learner-bg.jpg"
            alt="Mentorship and growth concept"
            fill
            className="object-cover"
            style={{ objectPosition: 'center' }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
        </div>
      </div>

      {/* Right side - Scrollable content */}
      <div className="w-full lg:w-1/2 lg:ml-[50%] flex flex-col min-h-screen">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}