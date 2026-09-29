export interface RpcConfig {
  url: string
  timeout: number
  headers?: Record<string, string>
  /** Maximum accepted successful response body size in bytes. */
  maxResponseBytes?: number
  /**
   * Optional caller-provided signal. When aborted, the in-flight request is
   * cancelled and callRpc resolves with a stable `ABORTED` error shape.
   */
  signal?: AbortSignal
}

export interface RpcError {
  message: string
  code?: string | number
  details?: unknown
  isTimeout?: boolean
}

export interface LatestLedgerResult {
  id?: string
  protocolVersion?: number
  sequence: number
}

/**
 * Authorization failure classifications that the app can recognize and
 * translate into concise, actionable discovery messages.
 */
export type AuthErrorKind =
  | 'missing-credentials'
  | 'invalid-credentials'
  | 'expired-credentials'
  | 'insufficient-scope'
  | 'rate-limited'
  | 'unknown'

/**
 * Stable authorization error shape returned by the network layer when an
 * RPC response indicates an authorization failure. The `message` field is
 * already mapped to a concise, actionable discovery message suitable for
 * rendering directly to the user.
 */
export interface AuthError extends RpcError {
  kind: AuthErrorKind
  /** Action the user can take to resolve the failure. */
  action?: string
}
