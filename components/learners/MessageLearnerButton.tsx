'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MessageLearnerButtonProps {
  learnerUserId: number
  learnerName: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
}

export function MessageLearnerButton({
  learnerUserId,
  learnerName,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
}: MessageLearnerButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (disabled) return

    setLoading(true)

    try {
      // Call API to create/get conversation
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learnerUserId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()

      // Navigate to messages page to open conversation
      window.location.href = '/mentor/messages'

      // Show success toast
      toast.success(`Redirecting to chat with ${learnerName}...`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast.error('Failed to start conversation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading || disabled}
      variant={variant}
      size={size}
      className={`gradient-bg ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <MessageCircle className="w-4 h-4 mr-2" />
          Message
        </>
      )}
    </Button>
  )
}