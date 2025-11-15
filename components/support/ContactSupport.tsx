"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  MessageCircle,
  Send
} from "lucide-react"
import { toast } from "sonner"

export default function ContactSupport() {
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
    urgency: "medium"
  })
  const [submitting, setSubmitting] = useState(false)

  const contactMethods = [
    {
      icon: MessageCircle,
      title: "Support Tickets",
      description: "Track your support requests",
      contact: "Login to create tickets",
      responseTime: "Within 24 hours"
    },
    {
      icon: Mail,
      title: "Contact Form",
      description: "Send us a message",
      contact: "Use the form below",
      responseTime: "We'll respond via email"
    }
  ]

  const businessHours = [
    { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM PST" },
    { day: "Saturday - Sunday", hours: "Email support only" },
    { day: "Response Time", hours: "Within 24 hours" }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })

      if (response.ok) {
        setContactForm({
          name: "",
          email: "",
          subject: "",
          category: "",
          message: "",
          urgency: "medium"
        })
        toast.success("Message sent successfully! We'll get back to you soon.")
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending contact form:', error)
      toast.error("Failed to send message. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Contact Methods */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Get in Touch</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {contactMethods.map((method, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <method.icon className="w-6 h-6 text-gray-700 mb-2" />
              <h4 className="font-semibold mb-1">{method.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{method.description}</p>
              <p className="text-sm text-gray-500">{method.responseTime}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send us a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={contactForm.category}
                    onValueChange={(value) => setContactForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="technical">Technical Support</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={contactForm.urgency}
                    onValueChange={(value) => setContactForm(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General question</SelectItem>
                      <SelectItem value="medium">Medium - Standard issue</SelectItem>
                      <SelectItem value="high">High - Important matter</SelectItem>
                      <SelectItem value="urgent">Urgent - Critical issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your inquiry"
                />
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Please provide details about your inquiry..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support Information */}
        <div className="space-y-6">
          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Times</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {businessHours.map((schedule, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-700">{schedule.day}</span>
                    <span className="text-gray-600">{schedule.hours}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips for Faster Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 mb-1">For Session Issues</p>
                  <p className="text-gray-600">
                    Include session ID and time
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">For Payment Issues</p>
                  <p className="text-gray-600">
                    Include transaction ID
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">For Technical Issues</p>
                  <p className="text-gray-600">
                    Include browser and device info
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">More Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <a href="/support#faq" className="block text-blue-600 hover:underline">
                  FAQ & Knowledge Base
                </a>
                <a href="/terms-of-service" className="block text-blue-600 hover:underline">
                  Terms of Service
                </a>
                <a href="/privacy-policy" className="block text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}