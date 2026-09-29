import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Card, Heading, IconButton } from '@stellar/design-system'
import { discoverContractKeys } from '../../../lib/network/discoverContractKeys'
import { extractFootprintKeys } from '../../../lib/network/footprint'
import { useLensStore } from '../../../store/lensStore'
import { validateContractRouteParam } from './-validateContractRouteParam'

export type DiscoveryLoadStatus = 'loading' | 'empty' | 'error' | 'success'

export interface DiscoveredKey {
  keyPath: string
  type: string
}

export interface DiscoveryLoadState {
  status: DiscoveryLoadStatus
  keys: Array<DiscoveredKey>
  error: string | null
  requestedKeyCount: number
  readOnlyKeys?: Array<string>
  readWriteKeys?: Array<string>
}

export function parseDiscoveryArguments(value: string): {
  args: Array<unknown> | null
  error: string | null
} {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return { args: null, error: 'Arguments must be a JSON array.' }
    }
    return { args: parsed, error: null }
  } catch {
    return { args: null, error: 'Enter valid JSON arguments.' }
  }
}

export function buildDiscoveryExplorerLocation(
  contractId: string,
  keyPath: string,
) {
  return {
    to: '/contracts/$contractId/explorer' as const,
    params: { contractId },
    search: { keys: keyPath },
  }
}

export interface DiscoveryInputValues {
  sourceAccount: string
  functionName: string
  args: Array<unknown>
}

export function dedupeDiscoveryKeys(
  keys: Array<DiscoveredKey> | undefined,
): Array<DiscoveredKey> {
  const seen = new Set<string>()
  return (keys ?? []).filter((item) => {
    if (typeof item.keyPath !== 'string' || item.keyPath.length === 0) {
      return false
    }
    if (seen.has(item.keyPath)) {
      return false
    }
    seen.add(item.keyPath)
    return true
  })
}

export function buildDiscoveryLoadState(
  partial: Partial<DiscoveryLoadState> = {},
): DiscoveryLoadState {
  const keys = dedupeDiscoveryKeys(partial.keys)
  const requestedKeyCount =
    typeof partial.requestedKeyCount === 'number'
      ? partial.requestedKeyCount
      : keys.length

  return {
    status: partial.status ?? (keys.length === 0 ? 'empty' : 'success'),
    keys,
    error: partial.error ?? null,
    requestedKeyCount,
    readOnlyKeys: partial.readOnlyKeys ?? [],
    readWriteKeys: partial.readWriteKeys ?? [],
  }
}

export function DiscoveryStateView({
  state,
  onRetry,
  onPinKey,
  onOpenKey,
}: {
  state: DiscoveryLoadState
  onRetry?: () => void
  onPinKey?: (keyPath: string) => void
  onOpenKey?: (keyPath: string) => void
}) {
  const handleRetry = useCallback(() => {
    onRetry?.()
  }, [onRetry])

  const keys = useMemo(() => dedupeDiscoveryKeys(state.keys), [state.keys])

  if (state.status === 'loading') {
    return (
      <Card>
        <div className="p-6 space-y-4">
          <Heading
            size="sm"
            as="h3"
            className="text-text-muted uppercase tracking-widest text-[11px] font-bold"
          >
            Loading discovered keys…
          </Heading>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 rounded bg-white/5 border border-border-dark animate-pulse"
              />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (state.status === 'empty') {
    const requestCount = state.requestedKeyCount
    return (
      <Card>
        <div className="p-6 space-y-3">
          <Heading size="sm" as="h3" className="text-white">
            No keys discovered yet
          </Heading>
          <p className="text-text-muted text-sm">
            {requestCount === 0
              ? 'No keys were requested for discovery.'
              : `${requestCount} requested key${requestCount === 1 ? '' : 's'} produced no discoverable results.`}
          </p>
        </div>
      </Card>
    )
  }

  if (state.status === 'error') {
    return (
      <Card>
        <div className="p-6 space-y-4 border border-red-500/20 bg-red-500/5 rounded-xl">
          <Heading size="sm" as="h3" className="text-red-300">
            Discovery failed
          </Heading>
          <p className="text-text-muted text-sm">
            {state.error || 'An unknown error occurred while discovering keys.'}
          </p>
          {onRetry && (
            <div>
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}
        </div>
      </Card>
    )
  }

  const { readOnly: readOnlyKeys, readWrite: readWriteKeys } =
    extractFootprintKeys({
      readOnly: state.readOnlyKeys,
      readWrite: state.readWriteKeys,
    })
  const hasFootprintGroups = readOnlyKeys.length > 0 || readWriteKeys.length > 0

  return (
    <div className="space-y-4">
      <Heading
        size="sm"
        as="h2"
        className="text-text-muted uppercase tracking-widest text-[11px] font-bold"
      >
        Discovered Keys
      </Heading>

      {hasFootprintGroups ? (
        <div className="space-y-5">
          {[
            { label: 'Read-only keys', type: 'Read-only', keys: readOnlyKeys },
            {
              label: 'Read-write keys',
              type: 'Read-write',
              keys: readWriteKeys,
            },
          ].map(({ label, type, keys: groupedKeys }) => (
            <section key={label} className="space-y-3">
              <Heading size="sm" as="h3" className="text-white">
                {label}
              </Heading>
              {groupedKeys.length ? (
                <div className="grid gap-3">
                  {groupedKeys.map((keyPath) => (
                    <DiscoveredKeyRow
                      key={keyPath}
                      item={{ keyPath, type }}
                      onPinKey={onPinKey}
                      onOpenKey={onOpenKey}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No keys in this group.
                </p>
              )}
            </section>
          ))}
        </div>
      ) : keys.length > 0 ? (
        <div className="grid gap-3">
          {keys.map((item) => (
            <DiscoveredKeyRow
              key={item.keyPath}
              item={item}
              onPinKey={onPinKey}
              onOpenKey={onOpenKey}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-muted">
          No keys discovered yet
        </div>
      )}
    </div>
  )
}

function DiscoveredKeyRow({
  item,
  onPinKey,
  onOpenKey,
}: {
  item: DiscoveredKey
  onPinKey?: (keyPath: string) => void
  onOpenKey?: (keyPath: string) => void
}) {
  return (
    <Card>
      <div className="p-4 flex items-center justify-between gap-4">
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => onOpenKey?.(item.keyPath)}
        >
          <div className="text-sm font-mono text-white truncate">
            {item.keyPath}
          </div>
          <div className="text-xs text-text-muted mt-1">{item.type}</div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenKey && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenKey(item.keyPath)}
            >
              Open in Explorer
            </Button>
          )}
          <IconButton
            icon="pin"
            altText="Add to watchlist"
            onClick={() => onPinKey?.(item.keyPath)}
            aria-label="Add to watchlist"
          />
        </div>
      </div>
    </Card>
  )
}

export function DiscoveryInput({
  isSubmitting,
  onDiscover,
}: {
  isSubmitting: boolean
  onDiscover: (input: DiscoveryInputValues) => void
}) {
  const [sourceAccount, setSourceAccount] = useState('')
  const [functionName, setFunctionName] = useState('')
  const [argumentInput, setArgumentInput] = useState('[]')
  const parsedArguments = useMemo(
    () => parseDiscoveryArguments(argumentInput),
    [argumentInput],
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !parsedArguments.args ||
      !sourceAccount.trim() ||
      !functionName.trim()
    ) {
      return
    }
    onDiscover({
      sourceAccount: sourceAccount.trim(),
      functionName: functionName.trim(),
      args: parsedArguments.args,
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <Heading size="sm" as="h2" className="text-white">
          Discover contract keys
        </Heading>
        <label className="block space-y-1 text-sm text-text-muted">
          Source account
          <input
            value={sourceAccount}
            onChange={(event) => setSourceAccount(event.target.value)}
            required
            autoComplete="off"
            className="block w-full rounded-md border border-border-dark bg-background-dark p-2 font-mono text-white"
            aria-label="Source account"
          />
        </label>
        <label className="block space-y-1 text-sm text-text-muted">
          Contract method
          <input
            value={functionName}
            onChange={(event) => setFunctionName(event.target.value)}
            required
            autoComplete="off"
            className="block w-full rounded-md border border-border-dark bg-background-dark p-2 font-mono text-white"
            aria-label="Contract method"
          />
        </label>
        <label className="block space-y-1 text-sm text-text-muted">
          JSON arguments
          <textarea
            value={argumentInput}
            onChange={(event) => setArgumentInput(event.target.value)}
            aria-label="JSON arguments"
            aria-invalid={parsedArguments.error !== null}
            aria-describedby="discovery-arguments-error"
            rows={4}
            className="block w-full resize-y rounded-md border border-border-dark bg-background-dark p-2 font-mono text-sm text-white"
          />
        </label>
        {parsedArguments.error && (
          <p
            id="discovery-arguments-error"
            role="alert"
            className="text-sm text-red-400"
          >
            {parsedArguments.error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={
            isSubmitting ||
            !sourceAccount.trim() ||
            !functionName.trim() ||
            parsedArguments.args === null
          }
        >
          {isSubmitting ? 'Discovering…' : 'Discover keys'}
        </Button>
      </form>
    </Card>
  )
}

export const Route = createFileRoute('/contracts/$contractId/discovery')({
  component: DiscoveryRoute,
  beforeLoad: ({ params }) => {
    const result = validateContractRouteParam(params.contractId)
    if (!result.ok) {
      console.error(`Invalid contract ID: ${result.reason}`)
    }
    return {
      normalizedContractId: result.ok ? result.contractId : params.contractId,
      discoveryLoadState: buildDiscoveryLoadState({
        status: 'loading',
        keys: [],
        error: null,
        requestedKeyCount: 0,
      }),
    }
  },
})

function DiscoveryRoute() {
  const { contractId } = Route.useParams()
  const { normalizedContractId, discoveryLoadState } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  const addToWatchlist = useLensStore((state) => state.addToWatchlist)
  const networkConfig = useLensStore((state) => state.networkConfig)
  const [state, setState] = useState<DiscoveryLoadState>(() =>
    buildDiscoveryLoadState(discoveryLoadState),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const lastInputRef = useRef<DiscoveryInputValues | null>(null)

  useEffect(
    () => () => {
      controllerRef.current?.abort()
      controllerRef.current = null
    },
    [],
  )

  const handleDiscover = async (input: DiscoveryInputValues) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    lastInputRef.current = input
    setIsSubmitting(true)
    setState((current) =>
      buildDiscoveryLoadState({ ...current, status: 'loading', error: null }),
    )

    try {
      const result = await discoverContractKeys({
        rpcUrl: networkConfig.rpcUrl,
        networkPassphrase: networkConfig.networkPassphrase,
        contractId: normalizedContractId || contractId,
        sourceAccount: input.sourceAccount,
        functionName: input.functionName,
        args: input.args,
        signal: controller.signal,
      })
      if (!result.success) {
        setState(
          buildDiscoveryLoadState({
            status: 'error',
            error: result.error,
            requestedKeyCount: 0,
          }),
        )
        return
      }

      const footprint = extractFootprintKeys(result.footprint)
      const discovered = [
        ...footprint.readOnly.map((keyPath) => ({
          keyPath,
          type: 'Read-only',
        })),
        ...footprint.readWrite.map((keyPath) => ({
          keyPath,
          type: 'Read-write',
        })),
      ]
      setState(
        buildDiscoveryLoadState({
          status: discovered.length ? 'success' : 'empty',
          keys: discovered,
          readOnlyKeys: footprint.readOnly,
          readWriteKeys: footprint.readWrite,
          requestedKeyCount: discovered.length,
        }),
      )
    } catch (error) {
      if (controllerRef.current !== controller) {
        return
      }
      setState(
        buildDiscoveryLoadState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Discovery failed',
          requestedKeyCount: 0,
        }),
      )
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setIsSubmitting(false)
      }
    }
  }

  const handlePinKey = (keyPath: string) => {
    addToWatchlist(contractId, keyPath)
  }

  const handleRetry = useCallback(() => {
    if (lastInputRef.current) {
      void handleDiscover(lastInputRef.current)
    }
  }, [handleDiscover])

  const discoveredKeys = useMemo(
    () =>
      buildDiscoveryLoadState({
        status: state.status,
        keys: state.keys,
        error: state.error,
        requestedKeyCount: state.requestedKeyCount,
        readOnlyKeys: state.readOnlyKeys,
        readWriteKeys: state.readWriteKeys,
      }),
    [state],
  )

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-dark pb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider font-mono">
              Discovery
            </span>
          </div>
          <Heading size="lg" as="h1" className="font-mono break-all text-white">
            {normalizedContractId || contractId}
          </Heading>
        </div>
      </header>

      <DiscoveryInput isSubmitting={isSubmitting} onDiscover={handleDiscover} />

      <DiscoveryStateView
        state={discoveredKeys}
        onRetry={handleRetry}
        onPinKey={handlePinKey}
        onOpenKey={(keyPath) =>
          void navigate(buildDiscoveryExplorerLocation(contractId, keyPath))
        }
      />
    </div>
  )
}
