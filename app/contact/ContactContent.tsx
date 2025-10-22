'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import UnifiedHeader from '@/components/UnifiedHeader'
import { Footer } from '@/components/landing/Footer'
import { Mail, Send, MessageCircle, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ContactContent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsSubmitted(true)
        toast.success('Message sent successfully!', {
          description: 'We will get back to you within 24 hours.'
        })
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        })
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      toast.error('Failed to send message', {
        description: 'Please try again or contact us directly at contact@bridge-mentor.com'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <UnifiedHeader />

      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white py-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full text-sm font-semibold text-blue-300 mb-6">
              We're Here to Help
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Get in Touch</h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Have a question or need assistance? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-300">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Quick Response</div>
                  <div className="text-sm text-slate-400">Usually within 24 hours</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Friendly Support</div>
                  <div className="text-sm text-slate-400">Real people, not bots</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

              {/* Contact Form */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Send className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">Send a Message</h2>
                  </div>

                  {isSubmitted ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">We got your message!</h3>
                      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                        Thanks for reaching out. Our team will review your message and get back to you soon.
                      </p>
                      <Button
                        onClick={() => setIsSubmitted(false)}
                        className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg"
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name" className="text-slate-700 font-semibold">Your Name *</Label>
                          <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="John Doe"
                            className="mt-2 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-slate-700 font-semibold">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="john@example.com"
                            className="mt-2 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="subject" className="text-slate-700 font-semibold">Subject *</Label>
                        <Input
                          id="subject"
                          required
                          value={formData.subject}
                          onChange={(e) => handleInputChange('subject', e.target.value)}
                          placeholder="How can we help you?"
                          className="mt-2 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message" className="text-slate-700 font-semibold">Your Message *</Label>
                        <Textarea
                          id="message"
                          required
                          value={formData.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          placeholder="Tell us what's on your mind..."
                          rows={6}
                          className="mt-2 border-slate-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Sending your message...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Send className="w-5 h-5 mr-2" />
                            Send Message
                          </div>
                        )}
                      </Button>

                      <p className="text-sm text-slate-500 text-center mt-4">
                        We typically respond within 24 hours during business days.
                      </p>
                    </form>
                  )}
                </div>
              </div>

              {/* Contact Info Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                {/* Direct Contact */}
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Direct Contact</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">Email Us</p>
                      <a
                        href="mailto:contact@bridge-mentor.com"
                        className="text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        contact@bridge-mentor.com
                      </a>
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-start gap-3 mb-3">
                        <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900">Response Time</p>
                          <p className="text-sm text-slate-600">Usually within 24 hours</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900">Support Hours</p>
                          <p className="text-sm text-slate-600">Mon - Fri, 9 AM - 6 PM PST</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Helpful Resources</h3>
                  <div className="space-y-3">
                    <a
                      href="/faqs"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <span className="text-xl">❓</span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">FAQs</div>
                        <div className="text-sm text-slate-600">Common questions answered</div>
                      </div>
                    </a>
                    <a
                      href="/terms-of-service"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <span className="text-xl">📄</span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Terms of Service</div>
                        <div className="text-sm text-slate-600">Platform guidelines</div>
                      </div>
                    </a>
                    <a
                      href="/privacy-policy"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <span className="text-xl">🔒</span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Privacy Policy</div>
                        <div className="text-sm text-slate-600">How we protect your data</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Urgent Help */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100 shadow-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">⚡</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Urgent Issue?</h3>
                      <p className="text-slate-700 text-sm leading-relaxed">
                        For time-sensitive problems during an active session, email us at{' '}
                        <a href="mailto:contact@bridge-mentor.com" className="font-semibold text-red-600 hover:text-red-700">
                          contact@bridge-mentor.com
                        </a>
                        {' '}with "URGENT" in the subject line.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}