'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) {
      console.log('MessageLearnerButton: Button is disabled, ignoring click')
      return
    }

    console.log('MessageLearnerButton: Button clicked for learner:', learnerName, 'ID:', learnerUserId)
    setLoading(true)

    try {
      console.log('MessageLearnerButton: Creating conversation with learnerUserId:', learnerUserId)

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

      console.log('MessageLearnerButton: Response status:', response.status)

      if (response.status === 401) {
        // User not authenticated, redirect to login
        toast.info('Please log in to message this learner')
        router.push('/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('MessageLearnerButton: Error response:', errorData)
        throw new Error(errorData.error || 'Failed to create conversation')
      }

      const data = await response.json()
      console.log('MessageLearnerButton: Conversation data:', data)

      if (!data.conversation) {
        console.error('MessageLearnerButton: No conversation in response')
        throw new Error('No conversation returned from API')
      }

      // Trigger a refresh of conversations in ChatContext
      window.dispatchEvent(new CustomEvent('refreshConversations'))

      // Small delay to ensure conversation is loaded in context
      await new Promise(resolve => setTimeout(resolve, 300))

      // Dispatch custom event to open MiniChatBar with the conversation
      const event = new CustomEvent('openMiniChat', {
        detail: { conversation: data.conversation }
      })
      console.log('MessageLearnerButton: Dispatching openMiniChat event with conversation:', data.conversation.id)
      window.dispatchEvent(event)

      // Show success toast
      toast.success(`Opening chat with ${learnerName}...`)

      console.log('MessageLearnerButton: Successfully opened chat')
    } catch (error) {
      console.error('MessageLearnerButton: Error creating conversation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation. Please try again.')
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