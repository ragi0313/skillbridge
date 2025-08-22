"use client"

import dynamic from "next/dynamic"

// Dynamically import Sonner to avoid SSR issues
const SonnerToaster = dynamic(() => 
  import("sonner").then((mod) => ({ default: mod.Toaster })), {
  ssr: false
})

export function Toaster() {
  return <SonnerToaster position="top-center" />
}