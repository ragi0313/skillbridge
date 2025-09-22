import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative bg-slate-900 text-white py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/filipino-professionals-in-modern-office-workspace-.jpg"
          alt="Filipino professionals workspace"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90"></div>
      </div>
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-balance text-white">
                Transform Your Career
                <br />
                <span className="text-blue-400">With Expert Mentors</span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Connect with industry leaders who've been there. Get personalized guidance to accelerate your growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/find-mentors">
               <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Find Your Mentor
              </Button>
              </Link>
              <Link href="/register/mentor">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-300 text-slate-300 hover:bg-slate-300 hover:text-slate-900 bg-transparent"
                >
                  Become a Mentor
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-slate-800/50 backdrop-blur border-slate-700">
                <img
                  src="/filipino-professional-mentor-in-video-call-mentori.jpg"
                  alt="Filipino mentor in video session"
                  className="w-full h-32 object-cover rounded mb-3"
                />
                <p className="text-sm text-slate-300">98% satisfaction rate</p>
              </Card>

              <Card className="p-4 bg-slate-800/50 backdrop-blur border-slate-700">
                <img
                  src="/diverse-group-of-filipino-professionals-in-modern-.jpg"
                  alt="Filipino professional team"
                  className="w-full h-32 object-cover rounded mb-3"
                />
                <p className="text-sm text-slate-300">5,000+ mentors ready to help</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
