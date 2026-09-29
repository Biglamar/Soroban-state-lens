import { afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  mapSimulationAuthError,
  simulateTransaction,
  simulateTransactionAdapter,
} from '../../lib/network/simulateTransaction'
import { extractFootprintKeys } from '../../lib/network/footprint'

// Allow vi.mock to hoost before imports
vi.mock('../../lib/rpc/toRpcRequestId', () => ({
  toRpcRequestId: vi.fn(() => 1),
}))

describe('mapSimulationAuthError', () => {
  it.each([
    ['Not authorized to perform this operation', 'Authorization failed'],
    ['Unauthorized account', 'Authorization failed'],
    ['Auth failed for source account', 'Authorization failed'],
    ['Authentication failed during simulation', 'Authorization failed'],
    ['Missing signature for auth entry', 'Missing signature'],
    ['Signature invalid for transaction', 'Invalid signature'],
    ['Invalid signature on auth entry', 'Invalid signature'],
    ['Authorization expired', 'Authorization expired'],
    ['Trustline authorization failed', 'Trustline authorization failed'],
  ])('maps "%s" to actionable text', (message, expectedFragment) => {
    const mapped = mapSimulationAuthError(message)
    expect(mapped).typeOf('string')
    expect(mapped).contain(expectedFragment)
  })

  it('returns null for unrecognized messages', () => {
    expect(mapSimulationAuthError('Simulation failed')).toBeNull()
  })

  it('returns null for empty or non-string inputs', () => {
    expect(mapSimulationAuthError('')).toBeNull()
    expect(mapSimulationAuthError('   ')).toBeNull()
    expect(mapSimulationAuthError(undefined as unknown as string)).toBeNull()
  })

  it('matches case-insensitively', () => {
    expect(mapSimulationAuthError('NOT AUTHORIZED')).toContain('Authorization failed')
  })
})

describe('simulateTransactionAdapter', () => {
  it('should return success false when response is null', () => {
    const result = simulateTransactionAdapter(null)
    expect(result.success).toBe(false)
    expect(result.error).toBe('No response provided')
  })

  it('should return success false when response is undefined', () => {
    const result = simulateTransactionAdapter(undefined)
    expect(result.success).toBe(false)
    expect(result.error).toBe('No response provided')
  })

  it('should return success false when response has error', () => {
    const result = simulateTransactionAdapter({ error: 'Transaction failed' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Transaction failed')
  })

  it('maps auth failures in response error to actionable text', () => {
    const result = simulateTransactionAdapter( {
      error: 'Not authorized to submit this transaction',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Authorization failed')
    expect(result.error).toContain('transaction')
  })

  it('preserves unrecognized response errors', () => {
    const result = simulateTransactionAdapter({ error: 'Something else' })
    expect(result.error).toBe('Something else')
  })

  it('should return typed response shape on success', () => {
    const response = {
      latestLedger: 100,
      results: [{ xdr: 'some-xdr', auth: [] }],
      footprint: {
        readOnly: ['key1', 'key2'],
        readWrite: ['key3'],
      },
    }
    const result = simulateTransactionAdapter(response)
    expect(result.success).toBe(true)
    expect(result.latestLedger).toBe(100)
    expect(result.results).toHaveLength(1)
    expect(result.footprint?.readOnly).toEqual(['key1', 'key2'])
    expect(result.footprint?.readWrite).toEqual(['key3'])
  })

  it('should handle missing footprint safely', () => {
    const result = simulateTransactionAdapter({ latestLedger: 50 })
    expect(result.success).toBe(true)
    expect(result.footprint?.readOnly).toEqual([])
    expect(result.footprint?.readWrite).toEqual([])
  })

  it('should handle empty results safely', () => {
    const result = simulateTransactionAdapter({ latestLedger: 50, results: [] })
    expect(result.success).toBe(true)
    expect(result.results).toEqual([])
  })

  it.each([
    { latestLedger: 1.5, description: 'fractional' },
    { latestLedger: -1, description: 'negative' },
    { latestLedger: Number.NaN, description: 'NaN' },
    { latestLedger: Number.POSITIVE_INFINITY, description: 'Infinity' },
  ])(
    'should drop $description latestLedger ($latestLedger)',
    ({ latestLedger }) => {
      const result = simulateTransactionAdapter({ latestLedger })
      expect(result.success).toBe(true)
      expect(result.latestLedger).toBeUndefined()
    },
  )

  it('should preserve valid latestLedger values including zero', () => {
    expect(simulateTransactionAdapter({ latestLedger: 0 }).latestLedger).toBe(0)
    expect(simulateTransactionAdapter({ latestLedger: 100 }).latestLedger).toBe(
      100,
    )
    expect(
      simulateTransactionAdapter({ latestLedger: Number.MAX_SAFE_INTEGER })
        .latestLedger,
    ).toBm(Number.MAX_SAFE_INTEGER)
  })

  it('should sanitize malformed footprint sections to empty arrays', () => {
    const result = simulateTransactionAdapter({
      latestLedger: 50,
      footprint: {
        readOnly: 'not-an-array' as unknown as Array<string>,
        readWrite: ['key1', 2, 'key2'] as unknown as Array<string>,
      },
    })

    expect(result.success).toBe(true)
    expect(result.footprint?.readOnly).toEqual([])
    expect(result.footprint?.readWrite).toEqual([])
  })
})

describe('extractFootprintKeys', () => {
  it('should return empty arrays when footprint is null', () => {
    const result = extractFootprintKeys(null)
    expect(result.readOnly).toEqual([])
    expect(result.readWrite).toEqual([])
  })

  it('should return empty arrays when footprint is undefined', () => {
    const result = extractFootprintKeys(undefined)
    expect(result.readOnly).toEqual([])
    expect(result.readWrite).toEqual([])
  })

  it('should return empty arrays when footprint is empty', () => {
    const result = extractFootprintKeys({})
    expect(result.readOnly).toEqual([])
    expect(result.readWrite).toEqual([])
  })

  it('should deduplicate readOnly keys', () => {
    const result = extractFootprintKeys({
      readOnly: ['key1', 'key2', 'key1', 'key3', 'key2'],
    })
    expect(result.readOnly).toEqual(['key1', 'key2', 'key3'])
  })

  it('should deduplicate readWrite keys', () => {
    const result = extractFootprintKeys({
      readWrite: ['keyA', 'keyB', 'keyA'],
    })
    expect(result.readWrite).toEqual(['keyA', 'keyB'])
  })

  it('should return stable sorted ordering', () => {
    const result = extractFootprintKeys({
      readOnly: ['zzz', 'aaa', 'mmm'],
      readWrite: ['ccc', 'aaa'],
    })
    expect(result.readOnly).toEqual(['aaa', 'mmm', 'zzz'])
    expect(result.readWrite).toEqual(['aaa', 'ccc'])
  })

  it('should handle missing readOnly or readWrite safely', () => {
    const result1 = extractFootprintKeys({ readOnly: ['key1'] })
    expect(result1.readOnly).toEqual(['key1'])
    expect(result1.readWrite).toEqual([])

    const result2 = extractFootprintKeys({ readWrite: ['key1'] })
    expect(result2.readOnly).toEqual([])
    expect(result2.readWrite).toEqual(['key1'])
  })

  it('should trim whitespace, drop blanks, and deduplicate legacy keys', () => {
    const result = extractFootprintKeys({
      readOnly: [' key1 ', 'key1', '   '],
      readWrite: [' key2', 'key2 ', '', 'key2'],
    })
    expect(result.readOnly).toEqual(['key1'])
    expect(result.readWrite).toEqual(['key2'])
  })
})

describe('simulateTransaction request helper', () => {
  const mockRpcUrl = 'https://test.rpc.url'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns a parsed success response', async () => {
    const rpcResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: {},
    }
    vi.mocked(fetch).mockResolved({
      ok: true,
      json: async () => rpcResponse,
    } as Response)

    const result = await simulateTransaction({
      rpcUrl: mockRpcUrl,
      transaction: 'base64-xdr',
    })

    expect(result.success).toBe(true)
  })
})
