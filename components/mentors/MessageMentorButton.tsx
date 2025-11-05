'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MessageMentorButtonProps {
  mentorUserId: number
  mentorName: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
}

export function MessageMentorButton({
  mentorUserId,
  mentorName,
  className,
  variant = 'outline',
  size = 'default',
  disabled = false,
}: MessageMentorButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
          mentorUserId,
        }),
      })

      if (response.status === 401) {
        // User not authenticated, redirect to login
        toast.info('Please log in to message this mentor')
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()

      // Dispatch custom event to open MiniChatBar with the conversation
      window.dispatchEvent(new CustomEvent('openMiniChat', {
        detail: { conversation: data.conversation }
      }))

      // Show success toast
      toast.success(`Opening chat with ${mentorName}...`)
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
      className={className}
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