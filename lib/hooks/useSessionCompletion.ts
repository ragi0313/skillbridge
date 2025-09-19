"use client"

import { useState, useCallback } from 'react'

export interface SessionCompletionData {
  sessionId: number
  userRole: "learner" | "mentor"
  otherParticipant: {
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
    title: string
  }
  sessionData: {
    durationMinutes: number
    skillName?: string
    totalCostCredits?: number
  }
  completionResult: {
    success: boolean
    status: string
    message: string
    paymentProcessed: boolean
    refundProcessed: boolean
    mentorEarnings: number
  }
}

// Global state for session feedback modal
let globalShowFeedbackModal = false
let globalSessionData: SessionCompletionData | null = null
let globalSetters: {
  setShowFeedbackModal: (show: boolean) => void
  setSessionData: (data: SessionCompletionData | null) => void
}[] = []

export function useSessionCompletion() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(globalShowFeedbackModal)
  const [sessionCompletionData, setSessionCompletionData] = useState<SessionCompletionData | null>(globalSessionData)

  // Register this component's setters
  useState(() => {
    const setters = { setShowFeedbackModal, setSessionData: setSessionCompletionData }
    globalSetters.push(setters)
    return () => {
      const index = globalSetters.indexOf(setters)
      if (index > -1) {
        globalSetters.splice(index, 1)
      }
    }
  })

  const updateGlobalState = useCallback((show: boolean, data: SessionCompletionData | null) => {
    globalShowFeedbackModal = show
    globalSessionData = data
    globalSetters.forEach(setter => {
      setter.setShowFeedbackModal(show)
      setter.setSessionData(data)
    })
  }, [])

  const handleSessionCompletion = useCallback(async (
    sessionId: number,
    reason: string = 'completed'
  ): Promise<{
    success: boolean
    shouldShowFeedback: boolean
    completionData?: any
  }> => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Check if session was successfully completed and should show feedback
      const shouldShowFeedback = result.success &&
        result.status === 'completed' &&
        !result.alreadyEnded &&
        result.sessionData?.paymentProcessed &&
        result.feedbackInfo?.shouldShowFeedback

      return {
        success: result.success,
        shouldShowFeedback,
        completionData: result
      }
    } catch (error) {
      console.error('Error completing session:', error)
      return {
        success: false,
        shouldShowFeedback: false
      }
    }
  }, [])

  const showFeedbackModalForSession = useCallback((data: SessionCompletionData) => {
    updateGlobalState(true, data)
  }, [updateGlobalState])

  const hideFeedbackModal = useCallback(() => {
    updateGlobalState(false, null)
  }, [updateGlobalState])

  const checkAndShowFeedbackAfterCompletion = useCallback(async (
    sessionId: number,
    userRole: "learner" | "mentor",
    otherParticipant: SessionCompletionData['otherParticipant'],
    sessionData: SessionCompletionData['sessionData'],
    reason: string = 'completed'
  ) => {
    const completion = await handleSessionCompletion(sessionId, reason)

    if (completion.shouldShowFeedback && completion.completionData) {
      // Check feedback info from the completion response
      const feedbackInfo = completion.completionData.feedbackInfo || {}
      const hasSubmittedFeedback = userRole === 'learner'
        ? feedbackInfo.learnerFeedbackSubmitted
        : feedbackInfo.mentorFeedbackSubmitted

      if (!hasSubmittedFeedback) {
        showFeedbackModalForSession({
          sessionId,
          userRole,
          otherParticipant,
          sessionData,
          completionResult: completion.completionData
        })
      }
    }

    return completion
  }, [handleSessionCompletion, showFeedbackModalForSession])

  return {
    showFeedbackModal,
    sessionCompletionData,
    handleSessionCompletion,
    showFeedbackModalForSession,
    hideFeedbackModal,
    checkAndShowFeedbackAfterCompletion
  }
}