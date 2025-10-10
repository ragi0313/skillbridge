import { Card } from "@/components/ui/card"

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground">Start learning from experts in 3 simple steps</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
              1
            </div>
            <h3 className="text-xl font-semibold mb-3">Create Profile</h3>
            <p className="text-muted-foreground">Tell us your goals and skills you want to develop</p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
              2
            </div>
            <h3 className="text-xl font-semibold mb-3">Find Mentor</h3>
            <p className="text-muted-foreground">Browse verified mentors and book sessions that fit your schedule</p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
              3
            </div>
            <h3 className="text-xl font-semibold mb-3">Start Learning</h3>
            <p className="text-muted-foreground">Connect via video call and get personalized guidance</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Card className="p-4">
              <img
                src="/filipino-professional-working-on-laptop-in-modern-.jpg"
                alt="Filipino professional learning environment"
                className="w-full h-80 object-cover rounded-lg mb-2"
              />
              <p className="text-sm text-muted-foreground">Flexible Learning Anywhere</p>
            </Card>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <img
                  src="/filipino-professionals-in-modern-conference-room-m.jpg"
                  alt="Filipino conference room session"
                  className="w-full h-64 object-cover rounded mb-2"
                />
                <p className="text-sm text-muted-foreground">Professional sessions available</p>
              </Card>

              <Card className="p-4">
                <img
                  src="/filipino-person-working-from-home-office-setup.jpg"
                  alt="Filipino home office session"
                  className="w-full h-64 object-cover rounded mb-2"
                />
                <p className="text-sm text-muted-foreground">1-on-1 mentorship</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
