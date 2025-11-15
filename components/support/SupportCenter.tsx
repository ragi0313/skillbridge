"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  MessageSquare,
  Mail
} from "lucide-react"
import UnifiedHeader from "@/components/UnifiedHeader"
import FAQSection from "./FAQSection"
import TicketSystem from "./TicketSystem"
import ContactSupport from "./ContactSupport"

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
}

interface SupportCenterProps {
  user: User | null
}

export default function SupportCenter({ user }: SupportCenterProps) {
  const [activeTab, setActiveTab] = useState("faq")
  const [searchQuery, setSearchQuery] = useState("")

  const supportStats = {
    openTickets: 0, // Will be fetched from API
  }

  const quickActions = [
    {
      icon: BookOpen,
      title: "Browse FAQ",
      description: "Find answers to common questions",
      action: () => setActiveTab("faq"),
    },
    {
      icon: MessageSquare,
      title: "Submit Ticket",
      description: user ? "Get personalized help from our team" : "Login required for ticket support",
      action: () => setActiveTab("tickets"),
    },
    {
      icon: Mail,
      title: "Contact Us",
      description: "Reach out directly",
      action: () => setActiveTab("contact"),
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Support Center
          </h1>
          <p className="text-gray-600">
            Get help with your BridgeMentor account and sessions
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
              onClick={action.action}
            >
              <action.icon className="w-6 h-6 text-gray-700 mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Main Support Content */}
        <Card>
          <CardHeader>
            <CardTitle>How can we help?</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="faq">
                  FAQ
                </TabsTrigger>
                <TabsTrigger value="tickets">
                  Support Tickets
                  {supportStats.openTickets > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1 min-w-[1rem] h-4 text-xs">
                      {supportStats.openTickets}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="contact">
                  Contact
                </TabsTrigger>
              </TabsList>

              <TabsContent value="faq" className="space-y-6">
                <FAQSection searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              </TabsContent>

              <TabsContent value="tickets" className="space-y-6">
                {user ? (
                  <TicketSystem user={user} />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h3>
                      <p className="text-gray-600 mb-4">
                        Please log in to your account to create and manage support tickets.
                      </p>
                      <div className="flex justify-center space-x-3">
                        <a href="/login">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            Log In
                          </Button>
                        </a>
                        <a href="/register">
                          <Button variant="outline">
                            Sign Up
                          </Button>
                        </a>
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        You can still use our FAQ section and contact form without an account.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-6">
                <ContactSupport />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}