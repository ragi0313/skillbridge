"use client"

import { SessionFeedbackModal } from './SessionFeedbackModal'
import { useSessionCompletion } from '@/lib/hooks/useSessionCompletion'

interface GlobalSessionFeedbackProviderProps {
  children: React.ReactNode
}

export function GlobalSessionFeedbackProvider({ children }: GlobalSessionFeedbackProviderProps) {
  const {
    showFeedbackModal,
    sessionCompletionData,
    hideFeedbackModal
  } = useSessionCompletion()

  const handleFeedbackSubmitted = () => {
    console.log('[FEEDBACK] Feedback submitted successfully')
    hideFeedbackModal()
  }

  const handleSkipFeedback = () => {
    console.log('[FEEDBACK] Feedback skipped by user')
    hideFeedbackModal()
  }

  return (
    <>
      {children}

      {/* Global Session Feedback Modal */}
      {sessionCompletionData && (
        <SessionFeedbackModal
          isOpen={showFeedbackModal}
          onClose={handleSkipFeedback}
          onSubmitted={handleFeedbackSubmitted}
          sessionId={sessionCompletionData.sessionId}
          userRole={sessionCompletionData.userRole}
          otherParticipant={sessionCompletionData.otherParticipant}
          sessionData={sessionCompletionData.sessionData}
        />
      )}
    </>
  )
}