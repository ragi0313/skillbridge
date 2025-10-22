'use client'
import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'
import { MessageLearnerButton } from './MessageLearnerButton'

const DynamicMessageLearnerButton = dynamic(
  () => Promise.resolve(MessageLearnerButton),
  {
    ssr: false,
    loading: () => (
      <button
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gradient-bg h-10 px-4 py-2"
        disabled
      >
        Message
      </button>
    )
  }
)

type MessageLearnerButtonProps = ComponentProps<typeof MessageLearnerButton>

export function MessageLearnerButtonWrapper(props: MessageLearnerButtonProps) {
  return <DynamicMessageLearnerButton {...props} />
}
