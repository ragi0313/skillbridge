/**
 * Session State Machine Validator
 * Ensures valid state transitions for booking sessions
 */

export type SessionStatus =
  | 'pending'
  | 'confirmed'
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'both_no_show'
  | 'mentor_no_show'
  | 'learner_no_show'
  | 'technical_issues'

/**
 * Valid state transitions map
 * Each key is a current state, and the value is an array of valid next states
 */
const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['upcoming', 'cancelled'],
  upcoming: ['ongoing', 'cancelled', 'mentor_no_show', 'learner_no_show', 'both_no_show'],
  ongoing: ['completed', 'technical_issues', 'cancelled'],
  completed: [], // Terminal state - no transitions allowed
  cancelled: [], // Terminal state
  both_no_show: [], // Terminal state
  mentor_no_show: [], // Terminal state
  learner_no_show: [], // Terminal state
  technical_issues: ['upcoming', 'cancelled'], // Can reschedule or cancel
}

/**
 * Terminal states that cannot transition to other states
 */
export const TERMINAL_STATES: SessionStatus[] = [
  'completed',
  'cancelled',
  'both_no_show',
  'mentor_no_show',
  'learner_no_show',
]

/**
 * Validates if a state transition is allowed
 */
export function isValidTransition(
  currentState: string | null,
  newState: string
): { valid: boolean; error?: string } {
  // If no current state, any initial state is valid
  if (!currentState) {
    return { valid: true }
  }

  // Check if states are valid
  if (!isValidSessionStatus(currentState)) {
    return {
      valid: false,
      error: `Invalid current state: ${currentState}`,
    }
  }

  if (!isValidSessionStatus(newState)) {
    return {
      valid: false,
      error: `Invalid new state: ${newState}`,
    }
  }

  // Same state is always valid (idempotent)
  if (currentState === newState) {
    return { valid: true }
  }

  const validNextStates = VALID_TRANSITIONS[currentState as SessionStatus]

  if (!validNextStates.includes(newState as SessionStatus)) {
    return {
      valid: false,
      error: `Cannot transition from '${currentState}' to '${newState}'. Valid transitions: ${validNextStates.join(', ') || 'none (terminal state)'}`,
    }
  }

  return { valid: true }
}

/**
 * Type guard to check if a string is a valid SessionStatus
 */
export function isValidSessionStatus(status: string): status is SessionStatus {
  return Object.keys(VALID_TRANSITIONS).includes(status)
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalState(status: string): boolean {
  return TERMINAL_STATES.includes(status as SessionStatus)
}

/**
 * Get all valid next states for a given current state
 */
export function getValidNextStates(currentState: string): SessionStatus[] {
  if (!isValidSessionStatus(currentState)) {
    return []
  }
  return VALID_TRANSITIONS[currentState as SessionStatus]
}

/**
 * Validates a state transition and throws an error if invalid
 */
export function validateTransitionOrThrow(
  currentState: string | null,
  newState: string
): void {
  const result = isValidTransition(currentState, newState)
  if (!result.valid) {
    throw new Error(result.error || 'Invalid state transition')
  }
}
