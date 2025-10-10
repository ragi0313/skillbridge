"use client"

import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import Logo from "../ui/logo"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-6">
        <nav className="flex items-center justify-between h-16">
          <Logo />

          <div className="hidden lg:flex items-center space-x-8">
            <a
              href="/find-mentors"
              className="text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors font-medium text-sm"
            >
              Browse Mentors
            </a>
            <a href="/pricing" className="text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors font-medium text-sm">
              Pricing
            </a>
            <a href="/faqs" className="text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors font-medium text-sm">
              FAQs
            </a>
          </div>

          <div className="hidden lg:flex items-center space-x-3">
            <Link href={'/register'}>
              <Button variant="ghost" className="w-full text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent font-medium text-sm">
                Sign Up
              </Button>
            </Link>
            <Link href={'/login'}>
              <Button className="w-full gradient-bg text-white font-medium text-sm">Login</Button>
            </Link>
          </div>

          <button
            className="lg:hidden p-2 text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-4">
              <a
                href="/find-mentors"
                className="block text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse Mentors
              </a>
              <a
                href="/pricing"
                className="block text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="/faqs"
                className="block text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQs
              </a>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                 <Link href={'/register'}>
                  <Button variant="ghost" className="w-full text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent font-medium text-sm">
                  Sign Up
                </Button>
                 </Link>
                <Link href={'/login'}>
                 <Button className="w-full gradient-bg text-white font-medium text-sm">Login</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
