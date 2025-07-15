// File: components/Footer.tsx
import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-22">
      <div className="container mx-auto px-4 grid md:grid-cols-4 gap-12">
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-9 h-9 relative">
              <img src="/logo.png" alt="SkillBridge Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">SkillBridge</span>
          </div>
          <p className="text-sm text-gray-400 max-w-xs">
            Empowering learners and mentors through a collaborative, credit-based platform built for the future of skill-sharing.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/signup" className="hover:underline">Get Started</Link></li>
            <li><Link href="/about" className="hover:underline">About Us</Link></li>
            <li><Link href="/contact" className="hover:underline">Contact</Link></li>
            <li><Link href="/faq" className="hover:underline">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/blog" className="hover:underline">Blog</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Follow Us</h4>
          <div className="flex space-x-4">
            <Link href="#" className="hover:text-white"><Facebook className="w-5 h-5" /></Link>
            <Link href="#" className="hover:text-white"><Twitter className="w-5 h-5" /></Link>
            <Link href="#" className="hover:text-white"><Instagram className="w-5 h-5" /></Link>
            <Link href="#" className="hover:text-white"><Linkedin className="w-5 h-5" /></Link>
          </div>
        </div>
      </div>
      <div className="text-center text-sm text-gray-500 mt-16">
        &copy; {new Date().getFullYear()} SkillBridge. All rights reserved.
      </div>
    </footer>
  )
}
