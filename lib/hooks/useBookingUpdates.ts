"use client"

import { useSessionUpdates } from './useSessionUpdates'

interface BookingUpdateData {
  type: string
  bookingId: number
  updateType: string
  newStatus?: string
  reason?: string
  refundAmount?: number
  timestamp: string
}

interface UseBookingUpdatesOptions {
  onBookingStatusChange?: (bookingId: number, newStatus: string, data: BookingUpdateData) => void
  enableToasts?: boolean
}

export function useBookingUpdates({
  onBookingStatusChange,
  enableToasts = true
}: UseBookingUpdatesOptions = {}) {
  const { isConnected } = useSessionUpdates({
    onBookingUpdate: (data) => {
      if (data.type === 'booking_update' && data.bookingId) {
        if (data.updateType === 'status_changed' && data.newStatus) {
          onBookingStatusChange?.(data.bookingId, data.newStatus, data as BookingUpdateData)
        }
      }
    },
    enableToasts
  })

  return {
    isConnected
  }
}