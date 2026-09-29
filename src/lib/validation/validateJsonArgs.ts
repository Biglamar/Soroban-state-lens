export interface JsonArgsValidatorResult {
  valid: boolean
  error?: string
  parsed?: unknown
}

/**
 * Determines whether a discovery transaction or argument draft contains edits.
 *
 * A draft is considered dirty when it is a non-empty, non-whitespace string
 * that differs from its original value. Nullish or empty inputs are clean.
 *
 * @param draft The current draft value.
 * @param original The original value to compare against.
 * @returns True when the draft contains unsaved edits.
 */
export function hasUnsavedDiscoveryEdits(
  draft: unknown,
  original: unknown = '',
): boolean {
  if (draft === null || draft === undefined) {
    return false
  }

  if (typeof draft !== 'string') {
    return true
  }

  if (draft.trim() === '') {
    return false
  }

  const originalValue = typeof original === 'string' ? original : ''
  return draft !== originalValue
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
