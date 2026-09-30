/**
 * simulateTransaction adapter for Soroban State Lens
 * Translates simulation responses into reusable discovery data
 */

import { normalizeFootprintKeys } from './normalizeFootprintKeys'

export interface SimulateTransactionResponse {
  results?: Array<{
    auth?: Array<unknown>
    xdr?: string
  }>
  footprint?: {
    readOnly?: Array<string>
    readWrite?: Array<string>
  }
  error?: string
  latestLedger?: number
}

export interface SimulateTransactionResult {
  success: boolean
  latestLedger?: number
  results?: Array<{
    auth?: Array<unknown>
    xdr?: string
  }>
  footprint?: {
    readOnly: Array<string>
    readWrite: Array<string>
  }
  error?: string
}

/**
 * Adapts a raw simulateTransaction response into a typed result shape
 */
export function simulateTransactionAdapter(
  response: SimulateTransactionResponse | null | undefined,
): SimulateTransactionResult {
  if (!response) {
    return { success: false, error: 'No response provided' }
  }

  if (response.error) {
    return { success: false, error: response.error }
  }

  if (
    response.latestLedger !== undefined &&
    (!Number.isFinite(response.latestLedger) ||
      !Number.isInteger(response.latestLedger) ||
      response.latestLedger < 0)
  ) {
    return { success: false, error: 'Invalid latest ledger value' }
  }

  const result: SimulateTransactionResult = {
    success: true,
    latestLedger: response.latestLedger,
    results: response.results ?? [],
    footprint: {
      readOnly: response.footprint?.readOnly ?? [],
      readWrite: response.footprint?.readWrite ?? [],
    },
  }

  const footprint = normalizeFootprintKeys(result)
  return {
    ...result,
    footprint: {
      readOnly: footprint.readOnly,
      readWrite: footprint.readWrite,
    },
  }
}
