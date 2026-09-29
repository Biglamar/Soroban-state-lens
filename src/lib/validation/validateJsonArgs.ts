export interface JsonArgsValidatorResult {
  valid: boolean
  error?: string
  parsed?: unknown
}

/**
 * Safely parses and validates a string as JSON arguments.
 *
 * Requirements:
 * - Empty or whitespace-only inputs are treated as valid (resolving to an empty array).
 * - Non-empty inputs must be valid parseable JSON.
 * - Safely handles non-string inputs by returning a validation failure.
 *
 * @param input The input string to validate.
 * @returns A validation result indicating success/failure and any parsing errors.
 */
export function validateJsonArgs(input: unknown): JsonArgsValidatorResult {
  if (input === null || input === undefined) {
    return { valid: true, parsed: [] }
  }

  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' }
  }

  const trimmed = input.trim()
  if (trimmed === '') {
    return { valid: true, parsed: [] }
  }

  try {
    const parsed = JSON.parse(trimmed)
    return { valid: true, parsed }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Invalid JSON'
    return {
      valid: false,
      error: `Invalid JSON format: ${errorMessage}`,
    }
  }
}

export interface DiscoveryDraftState {
  transaction?: unknown
  arguments?: unknown
}

/**
 * Determines whether a discovery draft contains unsaved edits.
 *
 * A draft is considered dirty when either the transaction or the arguments
 * field has meaningful content. Whitespace-only arguments and null/undefined
 * values are treated as clean to avoid false-positive leave warnings.
 */
export function hasUnsavedDiscoveryDraft(
  draft: DiscoveryDraftState | null | undefined,
): boolean {
  if (!draft) {
    return false
  }

  if (typeof draft.transaction === 'string') {
    if (draft.transaction.trim() !== '') {
      return true
    }
  } else if (draft.transaction != null) {
    return true
  }

  if (typeof draft.arguments === 'string') {
    return draft.arguments.trim() !== ''
  }

  return draft.arguments != null
}
