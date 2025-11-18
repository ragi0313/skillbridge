"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Send,
  Paperclip,
  Eye
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
}

interface TicketSystemProps {
  user: User
}

interface SupportTicket {
  id: number
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  description: string
  createdAt: string
  updatedAt: string
  lastResponseAt?: string
  responseCount: number
  assignedTo?: string
}

interface TicketMessage {
  id: number
  ticketId: number
  senderId: number
  senderType: 'user' | 'admin'
  senderName: string
  content: string
  createdAt: string
  attachments?: any[]
}

const ticketCategories = [
  {
    value: "technical",
    label: "Technical Issues",
    description: "App bugs, login problems, video/audio issues",
    template: "I'm experiencing a technical issue with:\n\nWhat happened:\n\nWhen it happened:\n\nBrowser/Device:\n\nError message (if any):\n\nSteps I've tried:"
  },
  {
    value: "billing",
    label: "Billing & Payments",
    description: "Credit purchases, refunds, payment problems",
    template: "Payment Issue:\n\nTransaction ID (if available):\n\nAmount:\n\nPayment method used:\n\nWhat went wrong:\n\nWhen it occurred:"
  },
  {
    value: "account",
    label: "Account & Profile",
    description: "Profile settings, password, account management",
    template: "Account Issue:\n\nWhat I'm trying to do:\n\nWhat's not working:\n\nAccount email:\n\nAdditional details:"
  },
  {
    value: "sessions",
    label: "Mentoring Sessions",
    description: "Booking, scheduling, session-related issues",
    template: "Session Issue:\n\nSession ID (if available):\n\nScheduled date/time:\n\nMentor/Learner name:\n\nWhat happened:\n\nScreenshots (attach if available):"
  },
  {
    value: "safety",
    label: "Safety & Reports",
    description: "Report inappropriate behavior or safety concerns",
    template: "Safety Report:\n\nUser being reported:\n\nSession ID (if applicable):\n\nDate/time of incident:\n\nWhat happened:\n\nAny evidence (screenshots, messages):"
  },
  {
    value: "feature",
    label: "Feature Request",
    description: "Suggest new features or improvements",
    template: "Feature Request:\n\nWhat feature would you like:\n\nWhy it would be helpful:\n\nHow it should work:\n\nWho would benefit:"
  },
  {
    value: "general",
    label: "General Questions",
    description: "Other questions not covered above",
    template: ""
  }
]

const priorityLevels = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800", description: "General questions, minor issues" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800", description: "Standard issues affecting usage" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800", description: "Important issues requiring quick attention" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800", description: "Urgent issues blocking core functionality" }
]

export default function TicketSystem({ user }: TicketSystemProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  // Form state for new ticket
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "medium" as const,
    description: ""
  })

  // Auto-fill template when category changes
  const handleCategoryChange = (value: string) => {
    const category = ticketCategories.find(c => c.value === value)
    setNewTicket(prev => ({
      ...prev,
      category: value,
      description: category?.template || ""
    }))
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id)
    }
  }, [selectedTicket])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/support/tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        throw new Error('Failed to fetch tickets')
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketMessages = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setTicketMessages(data.messages || [])
      } else {
        throw new Error('Failed to fetch messages')
      }
    } catch (error) {
      console.error('Error fetching ticket messages:', error)
      toast.error('Failed to load ticket messages')
    }
  }

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.category || !newTicket.description) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket)
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(prev => [data.ticket, ...prev])
        setNewTicket({ subject: "", category: "", priority: "medium", description: "" })
        setIsCreateDialogOpen(false)
        toast.success('Support ticket created successfully')
      } else {
        throw new Error('Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Failed to create support ticket')
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedTicket) return

    setSendingMessage(true)
    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageInput.trim() })
      })

      if (response.ok) {
        setMessageInput("")
        fetchTicketMessages(selectedTicket.id)
        fetchTickets() // Refresh to update response count
        toast.success('Message sent successfully')
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    return priorityLevels.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800'
  }

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === "active") {
      return ticket.status === 'open' || ticket.status === 'in_progress'
    } else {
      return ticket.status === 'resolved' || ticket.status === 'closed'
    }
  })

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a")
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Support Tickets</h3>
          <p className="text-gray-600">Track and manage your support requests</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={newTicket.category}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketCategories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          <div>
                            <div className="font-medium">{category.label}</div>
                            <div className="text-xs text-gray-500">{category.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value: any) => setNewTicket(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <div>
                            <div className="font-medium">{priority.label}</div>
                            <div className="text-xs text-gray-500">{priority.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={newTicket.category ? "Fill in the template below..." : "Please provide detailed information about your issue, including steps to reproduce if applicable"}
                  rows={10}
                  className="break-words overflow-wrap-anywhere"
                />
                {newTicket.category && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 A template has been added to help you provide all necessary details
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTicket}>
                  Create Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">Active ({tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})</TabsTrigger>
                  <TabsTrigger value="closed">Closed ({tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading tickets...</p>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No {activeTab} tickets</p>
                  </div>
                ) : (
                  filteredTickets.map(ticket => (
                    <Card
                      key={ticket.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm truncate pr-2">
                              #{ticket.id} {ticket.subject}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {ticketCategories.find(c => c.value === ticket.category)?.label}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.responseCount} responses
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(ticket.createdAt), "MMM d")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      #{selectedTicket.id} {selectedTicket.subject}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {ticketCategories.find(c => c.value === selectedTicket.category)?.label} •
                      Created {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Original Ticket */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{user.firstName} {user.lastName}</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(selectedTicket.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 break-words whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  {/* Messages */}
                  {ticketMessages.map(message => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg ${
                        message.senderType === 'user'
                          ? 'bg-blue-50 border border-blue-200 ml-8'
                          : 'bg-white border mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{message.senderName}</span>
                        {message.senderType === 'admin' && (
                          <Badge variant="outline" className="text-xs">Support Team</Badge>
                        )}
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 break-words whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t p-6">
                    <div className="flex space-x-4">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type your message..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        disabled={sendingMessage}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {sendingMessage ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Select a ticket</h3>
                <p className="text-gray-600">Choose a ticket from the list to view details and messages</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}