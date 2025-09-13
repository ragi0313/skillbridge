'use client'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { useMiniChat } from '@/lib/context/MiniChatContext'

interface MessageMentorButtonProps {
  mentorUserId: number
  mentorName: string
  mentorAvatar?: string
  disabled?: boolean
  className?: string
}

export function MessageMentorButton({ 
  mentorUserId, 
  mentorName, 
  mentorAvatar,
  disabled = false,
  className 
}: MessageMentorButtonProps) {
  const { openMiniChat } = useMiniChat()

  const handleClick = () => {
    if (disabled) return
    openMiniChat(mentorUserId, mentorName, mentorAvatar)
  }

  return (
    <Button 
      variant="outline" 
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Message
    </Button>
  )
}