"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowRight, Search } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

export default function HeroSection() {
  return (
    <section className="bg-gray-900 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/20">
              🚀 Connecting Skills, Building Futures
            </Badge>
            <h1 className="text-5xl font-bold leading-tight">
              Transform Your Freelancing Career with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {" "} 1-on-1 Expert Mentorship
              </span>
            </h1>
            <p className="text-lg text-gray-300">
              Get personalized guidance from freelancing experts, accelerate your growth, <br/> and achieve your freelancing goals faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8 py-6 gradient-bg transition-colors duration-300" asChild>
                <Link href="/register/learner">
                  Start Learning <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
               <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-transparent"
              >
                <Link href="/register/mentor">Become a Mentor</Link>
              </Button>
            </div>

            <div className="md:hidden mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search"
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-base"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[400px] rounded-xl overflow-hidden hidden md:block"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kobu-agency-7okkFhxrxNw-unsplash.jpg-5bKdOWwmUt1XymBAS7iBCKRukGOPiK.jpeg"
              alt="Mentorship image"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 mix-blend-multiply"></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
