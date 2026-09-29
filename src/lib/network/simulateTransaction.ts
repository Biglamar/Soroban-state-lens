/**
 * simulateTransaction adapter for Soroban State Lens
 * Translates simulation responses into reusable discovery data
 */

import { buildJsonRpcRequest } from '../rpc/buildJsonRpcRequest'
import { isJsonRpcErrorResponse } from '../rpc/isJsonRpcErrorResponse'
import { isJsonRpcSuccessResponse } from '../rpc/isJsonRpcSuccessResponse'
import { toRpcRequestId } from '../rpc/toRpcRequestId'
import { callRpc } from './rpcClient'
import type { RpcError } from './types'

export interface SimulateTransactionParams+ {
  rpcUrl: string
  /** Base64 transaction envelope XDR to simulate. */
  transaction: string
  signal?: AbortSignal
}

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

const activeSimulationControllers = new Map<string, AbortController>()

const abortedSimulationResult: SimulateTransactionResult = {
  success: false,
  error: 'Request aborted',
}

function sanitizeFootprintSection(value: unknown): Array<string> {
  if (!Array.isArray(value)) {
    return []
  }

  return value.every((item) => typeof item === 'string') ? value : []
}

function isRpcError(value: unknown): value is RpcError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'code' in value
  )
}

/**
 * Maps common auth failures from a simulation error message into a
 * concise, actionable discovery message. Returns `null` when the message
 * does not match a known auth failure so callers can fall back to the
 * original text.
 */
export function mapSimulationAuthError(message: string): string | null {
  if (typeof message !== 'string' || message.trim().length === 0) {
    return null
  }

  const normalized = message.toLowerCase()

  if (
    normalized.includes('not authorized') ||
    normalized.includes('unauthorized') ||
    normalized.includes('auth failed') ||
    normalized.includes('authentication failed')
  ) {
    return 'Authorization failed. Add the required signer to the transaction and retry.'
  }

  if (normalized.includes('missing signature')) {
    return 'Missing signature. Sign the transaction with the required key and retry.'
  }

  if (normalized.includes('signature invalid') || normalized.includes('invalid signature')) {
    return 'Invalid signature. Resign the transaction with the correct key and retry.'
  }

  if (normalized.includes('expired')) {
    return 'Authorization expired. Refresh the auth entry and retry.'
  }

  if (normalized.includes('trustline')) {
    return 'Trustline authorization failed. Add the required trustline and retry.'
  }

  return null
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
    return {
      success: false,
      error: mapSimulationAuthError(response.error) ?? response.error,
    }
  }

  const latestLedger =
    response.latestLedger !== undefined &&
    (typeof response.latestLedger !== 'number' ||
      !Number.isFinite(response.latestLedger) ||
      !Number.isInteger(response.latestLedger) ||
      response.latestLedger < 0)
      ? undefined
      : response.latestLedger

  return {
    success: true,
    latestLedger,
    results: response.results ?? [],
    footprint: {
      readOnly: sanitizeFootprintSection(response.footprint?.readOnly),
      readWrite: sanitizeFootprintSection(response.footprint?.readWrite),
    },
  }
}

/**
 * Sends a `simulateTransaction` JSON-RPC request and returns a normalized
 * result shape. Request failures (HTTP errors, JSON-RPC errors, malformed
 * payloads, and aborts) are surfaced as handled {@link SimulateTransactionResult}
 * values instead of thrown exceptions, so callers can branch on `success`
 * without try/catch.
 */
export async function simulateTransaction(
  params: SimulateTransactionParams,
): Promise<SimulateTransactionResult> {
  const previousController = activeSimulationControllers.get(params.rpcUrl)
  previousController?.abort()

  if (!params.transaction) {
    return { success: false, error: 'Transaction XDR is required' }
  }

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  if (params.signal?.aborted) {
    controller.abort()
  } else {
    params.signal?.addEventListener('abort', abortFromCaller, { once: true })
  }
  activeSimulationControllers.set(params.rpcUrl, controller)

  try {
    const result = await performSimulationRequest({
      ...params,
      signal: controller.signal,
    })

    return controller.signal.aborted ? abortedSimulationResult : result
  } finally {
    params.signal?.removeEventListener('abort', abortFromCaller)
    if (activeSimulationControllers.get(params.rpcUrl) === controller) {
      activeSimulationControllers.delete(params.rpcUrl)
    }
  }
}

async function performSimulationRequest(
  params: SimulateTransactionParams,
): Promise<SimulateTransactionResult> {
  const { rpcUrl, transaction, signal } = params

  const requestId = toRpcRequestId()
  const payload = buildJsonRpcRequest(
    'simulateTransaction',
    { transaction },
    requestId,
  )

  const data = await callRpc<unknown>(
    { url: rpcUrl, timeout: 10_000, signal },
    payload,
  )

  if (isRpcError(data)) {
    if (data.code === 'ABORTED') {
      return { success: false, error: 'Request aborted' }
    }
    const rawMessage =
      data.code === 'NETWORK_ERROR' && typeof data.details === 'string'
        ? data.details
        : data.message
    return {
      success: false,
      error: mapSimulationAuthError(rawMessage) ?? rawMessage,
    }
  }

  if (isJsonRpcErrorResponse(data, requestId)) {
    const mapped = mapSimulationAuthError(data.error.message)
    return {
      success: false,
      error: mapped ?? `RPC Error (${data.error.code}): ${data.error.message}`,
    }
  }

  if (!isJsonRpcSuccessResponse(data, requestId)) {
    return { success: false, error: 'Invalid JSON-RPC response format' }
  }

  const result = data.result as SimulateTransactionResponse | undefined
  return simulateTransactionAdapter(result ?? null)
}
