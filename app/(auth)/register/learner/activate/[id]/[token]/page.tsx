"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ActivatePage() {
  const { id, token } = useParams() as { id: string; token: string }
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    async function verifyUser() {
      try {
        const res = await fetch(`/api/verify/${id}/${token}`, {
          method: "POST",
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setStatus("success")
        } else {
          console.error("Verification failed:", data)
          setStatus("error")
        }
      } catch (err) {
        console.error("Fetch error:", err)
        setStatus("error")
      }
    }
    if (id && token) {
      verifyUser()
    }
  }, [id, token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 blur-2xl"></div>
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 blur-2xl"></div>

          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12 text-center">
            {/* Loading State */}
            {status === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 gradient-bg rounded-full animate-pulse opacity-20"></div>
                  <div className="relative w-full h-full gradient-bg rounded-full flex items-center justify-center shadow-lg">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
                    Verifying your email
                  </h1>
                  <p className="text-gray-600 text-lg">Please wait while we activate your account...</p>
                </div>

                <div className="flex justify-center">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="space-y-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="relative w-28 h-28 mx-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse opacity-20"></div>
                  <div className="relative w-full h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-14 h-14 text-white" />
                  </div>
                  {/* Success particles */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full opacity-80"
                  ></motion.div>
                </motion.div>

                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                    Welcome to BridgeMentor!
                  </h1>
                  <p className="text-gray-600 text-xl mb-2">🎉 Your email has been verified successfully</p>
                  <p className="text-gray-500 text-lg">Your account is now active and ready to use</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center justify-center space-x-3 text-green-700 mb-4">
                    <Mail className="w-6 h-6" />
                    <span className="font-semibold text-lg">Account Activated</span>
                  </div>
                  <p className="text-green-600 text-center">
                    You can now access all features and start your learning journey with expert mentors.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    variant="outline"
                    className="h-14 px-8 text-base bg-white/50 border-gray-200 hover:bg-white/80 rounded-xl transition-all duration-300"
                  >
                    <Link href="/">
                      <Home className="w-5 h-5 mr-2" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="space-y-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="relative w-28 h-28 mx-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-rose-500 rounded-full animate-pulse opacity-20"></div>
                  <div className="relative w-full h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                    <XCircle className="w-14 h-14 text-white" />
                  </div>
                </motion.div>

                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-4">
                    Verification Failed
                  </h1>
                  <p className="text-gray-600 text-xl mb-2">❌ We couldn't verify your email address</p>
                  <p className="text-gray-500 text-lg">The activation link may be invalid, expired, or already used</p>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100">
                  <div className="text-red-700 space-y-3">
                    <p className="font-semibold text-lg mb-3">Common issues:</p>
                    <ul className="text-left space-y-2 text-red-600">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>The activation link has expired (links are valid for 24 hours)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>The link has already been used to activate your account</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>The link was copied incorrectly or is incomplete</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
