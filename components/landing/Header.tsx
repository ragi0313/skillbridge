"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Logo from "../ui/logo";

export default function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search"
              className="pl-10 bg-white border-gray-200 focus:border-blue-500 placeholder:text-base"
            />
          </div>
        </div>

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