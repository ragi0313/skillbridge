"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Logo from "../ui/logo"

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/credits/pricing"
                className={`px-3 py-2 rounded-md text-md font-medium transition-colors ${
                  pathname === "/credits/pricing"
                    ? "bg-blue-600 text-white"
                    : "hover:text-white hover:bg-gray-800"
                }`}
              >
                Pricing
              </Link>
            </nav>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Link href="/login">Login</Link>
          </Button>
          <Button>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
