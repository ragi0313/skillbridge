import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export function StartJourneySection() {
  return (
    <section className="relative bg-slate-900 text-white py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-balance text-white">Start Your Journey Today</h2>
              <p className="text-xl text-slate-300">
                Join thousands who've accelerated their careers with expert mentorship
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-300">1-on-1 sessions with verified experts</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-300">Flexible scheduling at your pace</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-300">Transparent pricing, no hidden fees</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-300 hover:bg-slate-300 hover:text-slate-900 bg-transparent"
              >
                Browse Mentors
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="p-3 bg-slate-800/50 backdrop-blur border-slate-700">
              <img
                src="/diverse-professionals-in-meeting.jpg"
                alt="Professional meeting"
                className="w-full h-20 object-cover rounded mb-2"
              />
            </Card>
            <Card className="p-3 bg-slate-800/50 backdrop-blur border-slate-700">
              <img
                src="/business-team-collaboration.png"
                alt="Team collaboration"
                className="w-full h-20 object-cover rounded mb-2"
              />
            </Card>
            <Card className="p-3 bg-slate-800/50 backdrop-blur border-slate-700">
              <img
                src="/professional-video-conference.jpg"
                alt="Video conference"
                className="w-full h-20 object-cover rounded mb-2"
              />
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
