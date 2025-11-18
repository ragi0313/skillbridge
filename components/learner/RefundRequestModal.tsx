'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, AlertCircle } from 'lucide-react'

interface RefundRequestModalProps {
  sessionId: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RefundRequestModal({ sessionId, isOpen, onClose, onSuccess }: RefundRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [requestReason, setRequestReason] = useState<string>('')
  const [detailedReason, setDetailedReason] = useState('')

  const handleSubmit = async () => {
    if (!requestReason) {
      toast.error('Please select a reason for your refund request')
      return
    }

    if (detailedReason.trim().length < 10) {
      toast.error('Please provide a detailed explanation (at least 10 characters)')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/request-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestReason,
          detailedReason: detailedReason.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit refund request')
      }

      toast.success('Refund request submitted successfully!', {
        description: 'Our admin team will review your request shortly.',
      })

      onSuccess()
      onClose()
      setRequestReason('')
      setDetailedReason('')
    } catch (error) {
      console.error('Error submitting refund request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit refund request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Session Refund</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Refund Request Process:</p>
              <p>Our admin team will review your request and refund credits to your account if approved.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund *</Label>
            <Select value={requestReason} onValueChange={setRequestReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical_issues">Technical Issues</SelectItem>
                <SelectItem value="mentor_no_show">Mentor Didn't Show Up</SelectItem>
                <SelectItem value="quality_issues">Quality/Content Issues</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detailed Explanation *</Label>
            <Textarea
              id="details"
              placeholder="Please provide specific details about your experience and why you're requesting a refund. Include any relevant information that will help our team review your request."
              value={detailedReason}
              onChange={(e) => setDetailedReason(e.target.value)}
              rows={6}
              className="resize-none break-words"
            />
            <p className="text-xs text-gray-500">Minimum 10 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
