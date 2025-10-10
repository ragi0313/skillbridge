"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Mail,
  Search,
  ArrowRight,
  Clock,
  CheckCircle2
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
    avgResponseTime: "2 hours",
    openTickets: 0, // Will be fetched from API
    resolvedTickets: 0,
    satisfaction: "98%"
  }

  const quickActions = [
    {
      icon: BookOpen,
      title: "Browse FAQ",
      description: "Find answers to common questions",
      action: () => setActiveTab("faq"),
      color: "bg-blue-50 text-blue-600 border-blue-200"
    },
    {
      icon: MessageSquare,
      title: "Submit Ticket",
      description: user ? "Get personalized help from our team" : "Login required for ticket support",
      action: () => setActiveTab("tickets"),
      color: "bg-green-50 text-green-600 border-green-200"
    },
    {
      icon: Mail,
      title: "Contact Us",
      description: "Reach out via email or other channels",
      action: () => setActiveTab("contact"),
      color: "bg-purple-50 text-purple-600 border-purple-200"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Support Center
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get the help you need to make the most of your BridgeMentor experience
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 ${action.color}`}
              onClick={action.action}
            >
              <CardContent className="p-6 text-center">
                <action.icon className="w-12 h-12 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                <p className="text-sm opacity-80 mb-4">{action.description}</p>
                <ArrowRight className="w-5 h-5 mx-auto opacity-60" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-gray-900">{supportStats.avgResponseTime}</div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold text-gray-900">{supportStats.openTickets}</div>
              <div className="text-sm text-gray-600">Open Tickets</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-gray-900">{supportStats.resolvedTickets}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-gray-900">{supportStats.satisfaction}</div>
              <div className="text-sm text-gray-600">Satisfaction</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Support Content */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">How can we help you?</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="faq" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  FAQ & Guides
                </TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Support Tickets
                  {supportStats.openTickets > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1 min-w-[1rem] h-4 text-xs">
                      {supportStats.openTickets}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Us
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