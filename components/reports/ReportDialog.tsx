"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Flag } from "lucide-react"
import { useRouter } from "next/navigation"

interface ReportDialogProps {
  reportedUserId: number
  reportedUserName: string
  sessionId?: number
  trigger?: React.ReactNode
}

export default function ReportDialog({ reportedUserId, reportedUserName, sessionId, trigger }: ReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const categories = [
    { value: "harassment", label: "Harassment or Bullying" },
    { value: "inappropriate_content", label: "Inappropriate Content" },
    { value: "fraud", label: "Fraud or Scam" },
    { value: "spam", label: "Spam" },
    { value: "other", label: "Other" },
  ]

  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      setError("Please select a category and provide a description")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/user-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId,
          category,
          description,
          sessionId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setOpen(false)
        setCategory("")
        setDescription("")
        // Show success message (you can use a toast here)
        alert(data.message || "Report submitted successfully")
        router.refresh()
      } else {
        setError(data.error || "Failed to submit report")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
            <Flag className="w-4 h-4 mr-2" />
            Report User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Report {reportedUserName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide as much detail as possible to help us investigate.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> False reports may result in action against your account.
              Our team will review this report and take appropriate action.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !category || !description.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
