import { Card } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export function WhyLearnSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-balance">Why Learn With BridgeMentor</h2>
          <p className="text-xl text-muted-foreground">Get personalized guidance that accelerates your growth</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Learn at Your Pace</h3>
                <p className="text-muted-foreground">Flexible scheduling that fits your lifestyle and learning speed</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Expert Guidance</h3>
                <p className="text-muted-foreground">
                  Learn from professionals who've mastered what you want to achieve
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Clear Pricing</h3>
                <p className="text-muted-foreground">No hidden fees - pay only for the time you use with mentors</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Card className="p-6">
              <img
                src="/filipino-mentor-and-student-in-professional-1-on-1.jpg"
                alt="Filipino 1-on-1 mentoring session"
                className="w-full aspect-[4/3] object-cover object-center rounded-lg"
              />
              <div className="absolute top-8 right-8 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                1-on-1 Video Sessions
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
