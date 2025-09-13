'use client'
import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'
import { MessageMentorButton } from './MessageMentorButton'

const DynamicMessageMentorButton = dynamic(
  () => Promise.resolve(MessageMentorButton),
  { 
    ssr: false,
    loading: () => (
      <button 
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        disabled
      >
        Message
      </button>
    )
  }
)

type MessageMentorButtonProps = ComponentProps<typeof MessageMentorButton>

export function MessageMentorButtonWrapper(props: MessageMentorButtonProps) {
  return <DynamicMessageMentorButton {...props} />
}