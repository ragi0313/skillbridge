'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Filter,
  Search,
  Calendar,
  Send,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

interface SupportTicket {
  id: number
  userId?: number
  name: string
  email: string
  category: string
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedTo?: number
  adminNotes?: string
  responseCount: number
  createdAt: string
  lastResponseAt?: string
  resolvedAt?: string
  closedAt?: string
}

interface TicketResponse {
  id: number
  ticketId: number
  responderType: 'user' | 'admin' | 'system'
  responderName: string
  responderEmail: string
  message: string
  isInternal: boolean
  createdAt: string
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

interface SupportTicketsProps {
  onTicketUpdate?: () => void
}

export default function SupportTickets({ onTicketUpdate }: SupportTicketsProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketResponses, setTicketResponses] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: 'all', category: 'all', priority: 'all' })
  const [searchTerm, setSearchTerm] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // Fetch tickets
  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/admin/support-tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets)
      } else {
        toast.error('Failed to load support tickets')
      }
    } catch (error) {
      toast.error('Error loading support tickets')
    } finally {
      setLoading(false)
    }
  }

  // Fetch ticket responses
  const fetchTicketResponses = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}/responses`)
      if (response.ok) {
        const data = await response.json()
        setTicketResponses(data.responses)
      }
    } catch (error) {
      toast.error('Error loading ticket responses')
    }
  }

  // Update ticket status
  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        toast.success('Ticket status updated')
        fetchTickets()
        onTicketUpdate?.() // Refresh sidebar counts
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: status as any })
        }
      } else {
        toast.error('Failed to update ticket status')
      }
    } catch (error) {
      toast.error('Error updating ticket status')
    }
  }

  // Send reply
  const sendReply = async (ticketId: number, message: string, isInternal: boolean = false) => {
    setSendingReply(true)
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isInternal })
      })

      if (response.ok) {
        toast.success(isInternal ? 'Internal note added' : 'Reply sent successfully')
        setReplyMessage('')
        setInternalNote('')
        fetchTicketResponses(ticketId)
        fetchTickets() // Refresh to update response count
      } else {
        toast.error('Failed to send reply')
      }
    } catch (error) {
      toast.error('Error sending reply')
    } finally {
      setSendingReply(false)
    }
  }

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filter.status === 'all' || ticket.status === filter.status
    const matchesCategory = filter.category === 'all' || ticket.category === filter.category
    const matchesPriority = filter.priority === 'all' || ticket.priority === filter.priority

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority
  })

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    fetchTicketResponses(ticket.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600">Manage customer support tickets and email communications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50">
            {tickets.filter(t => t.status === 'open').length} Open
          </Badge>
          <Badge variant="outline" className="bg-purple-50">
            {tickets.filter(t => t.status === 'in_progress').length} In Progress
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filter.status} onValueChange={(value) => setFilter({...filter, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.category} onValueChange={(value) => setFilter({...filter, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="technical">Technical Issue</SelectItem>
                <SelectItem value="billing">Billing & Payments</SelectItem>
                <SelectItem value="account">Account Support</SelectItem>
                <SelectItem value="mentorship">Mentorship Questions</SelectItem>
                <SelectItem value="report">Report an Issue</SelectItem>
                <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.priority} onValueChange={(value) => setFilter({...filter, priority: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-600">No support tickets match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">#{ticket.id} - {ticket.subject}</h3>
                      <Badge className={priorityColors[ticket.priority]}>
                        {ticket.priority.toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        <span>{ticket.name} ({ticket.email})</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        <span>{ticket.responseCount} responses</span>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-2">{ticket.message}</p>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {ticket.category}
                      </span>
                      {ticket.lastResponseAt && (
                        <span className="text-xs text-gray-500">
                          Last response: {new Date(ticket.lastResponseAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => openTicket(ticket)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Support Ticket #{selectedTicket?.id} - {selectedTicket?.subject}
                          </DialogTitle>
                        </DialogHeader>

                        {selectedTicket && (
                          <div className="space-y-6">
                            {/* Ticket Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <Label className="text-sm font-medium text-gray-600">From</Label>
                                <p className="text-sm">{selectedTicket.name} ({selectedTicket.email})</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Category</Label>
                                <p className="text-sm">{selectedTicket.category}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Priority</Label>
                                <Badge className={priorityColors[selectedTicket.priority]}>
                                  {selectedTicket.priority.toUpperCase()}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">Status</Label>
                                <div className="flex items-center space-x-2">
                                  <Badge className={statusColors[selectedTicket.status]}>
                                    {selectedTicket.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  <Select
                                    value={selectedTicket.status}
                                    onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="in_progress">In Progress</SelectItem>
                                      <SelectItem value="resolved">Resolved</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Original Message */}
                            <div className="border rounded-lg p-4">
                              <Label className="text-sm font-medium text-gray-600">Original Message</Label>
                              <p className="mt-2 whitespace-pre-wrap">{selectedTicket.message}</p>
                              <div className="text-xs text-gray-500 mt-2">
                                {new Date(selectedTicket.createdAt).toLocaleString()}
                              </div>
                            </div>

                            {/* Responses */}
                            <div className="space-y-4">
                              <Label className="text-lg font-semibold">Conversation</Label>
                              {ticketResponses.map((response) => (
                                <div
                                  key={response.id}
                                  className={`border rounded-lg p-4 ${
                                    response.responderType === 'admin'
                                      ? 'bg-blue-50 border-blue-200'
                                      : response.isInternal
                                        ? 'bg-yellow-50 border-yellow-200'
                                        : 'bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{response.responderName}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {response.responderType}
                                      </Badge>
                                      {response.isInternal && (
                                        <Badge variant="outline" className="text-xs bg-yellow-100">
                                          Internal Note
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(response.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap">{response.message}</p>
                                </div>
                              ))}
                            </div>

                            {/* Reply Form */}
                            <Tabs defaultValue="reply" className="w-full">
                              <TabsList>
                                <TabsTrigger value="reply">Send Reply</TabsTrigger>
                                <TabsTrigger value="internal">Internal Note</TabsTrigger>
                              </TabsList>

                              <TabsContent value="reply" className="space-y-4">
                                <div>
                                  <Label htmlFor="reply">Reply to Customer</Label>
                                  <Textarea
                                    id="reply"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type your reply here..."
                                    rows={4}
                                    className="mt-1"
                                  />
                                </div>
                                <Button
                                  onClick={() => sendReply(selectedTicket.id, replyMessage)}
                                  disabled={!replyMessage.trim() || sendingReply}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {sendingReply ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Sending...
                                    </div>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-2" />
                                      Send Reply
                                    </>
                                  )}
                                </Button>
                              </TabsContent>

                              <TabsContent value="internal" className="space-y-4">
                                <div>
                                  <Label htmlFor="internal">Internal Note (Not visible to customer)</Label>
                                  <Textarea
                                    id="internal"
                                    value={internalNote}
                                    onChange={(e) => setInternalNote(e.target.value)}
                                    placeholder="Add internal notes here..."
                                    rows={4}
                                    className="mt-1"
                                  />
                                </div>
                                <Button
                                  onClick={() => sendReply(selectedTicket.id, internalNote, true)}
                                  disabled={!internalNote.trim() || sendingReply}
                                  variant="outline"
                                >
                                  {sendingReply ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                      Adding...
                                    </div>
                                  ) : (
                                    <>
                                      <MessageSquare className="w-4 h-4 mr-2" />
                                      Add Internal Note
                                    </>
                                  )}
                                </Button>
                              </TabsContent>
                            </Tabs>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Select
                      value={ticket.status}
                      onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}