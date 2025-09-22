import { Card } from "@/components/ui/card"
import { DollarSign, Calendar, TrendingUp, Shield } from "lucide-react"

export function EarnWhileTeachSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Earn While You Teach</h2>
          <p className="text-xl text-muted-foreground">Turn your expertise into income</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <DollarSign className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Set Your Own Rates</h3>
                <p className="text-muted-foreground">Choose what your time is worth. No price restrictions.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Flexible Schedule</h3>
                <p className="text-muted-foreground">Teach when you want. Accept bookings that fit your calendar.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Transparent Commissions</h3>
                <p className="text-muted-foreground">Know exactly what you earn. No hidden platform fees.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary rounded-full p-2 mt-1">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Verified Profiles</h3>
                <p className="text-muted-foreground">Build credibility with verified expertise and student reviews.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <img
                src="/filipino-professional-mentor-teaching-online-from-.jpg"
                alt="Filipino professional mentor"
                className="w-full h-32 object-cover rounded mb-3"
              />
              <p className="text-sm text-muted-foreground">Expert Guidance</p>
            </Card>

            <Card className="p-4">
              <img
                src="/filipino-mentor-and-student-in-friendly-video-call.jpg"
                alt="Filipino mentoring session"
                className="w-full h-32 object-cover rounded mb-3"
              />
              <p className="text-sm text-muted-foreground">1-on-1 Sessions</p>
            </Card>

            <Card className="p-4 col-span-2">
              <img
                src="/successful-filipino-freelance-mentor-working-on-la.jpg"
                alt="Successful Filipino mentor"
                className="w-full h-32 object-cover rounded mb-3"
              />
              <p className="text-sm text-muted-foreground">Grow Your Impact</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
