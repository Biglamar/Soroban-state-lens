import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { validateContractRouteParam } from './-validateContractRouteParam'
import { selectSnapshotsForContract } from '../../../store/selectors'
import type { ContractSnapshot } from '../../../store/types'

export const Route = createFileRoute(
  ('/contracts/$contractId/history' as unknown) as any,
)({
  beforeLoad: ({ params }) => {
    validateContractRouteParam(params.contractId)
  },
  component: ContractHistoryRoute,
})

export function formatSnapshotTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return 'Unknown time'
  }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }
  return date.toLocaleString()
}

export function countSnapshotEntries(sn: ContractSnapshot): number {
  if (!sn.ledgerData) {
    return 0
  }
  return Object.keys(sn.ledgerData).length
}

export function sortSnapshotsByRecency(
  snapshots: Array<ContractSnapshot>,
): Array<ContractSnapshot> {
  return [...snapshots].sort((a, b) => b.timestamp - a.timestamp)
}

function ContractHistoryRoute() {
  const { contractId } = Route.useParams()
  const id = contractId
  const snapshots = useStore(selectSnapshotsForContract(id))
  const orderedSnapshots = sortSnapshotsByRecency(snapshots)

  return (
    <div className="flex flex-col h-full p-6 text-white font-mono">
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
          Contract History
        </p>
        <h1 className="text-lg font-bold break-all">{id}</h1>
      </div>
      {orderedSnapshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          No snapshots recorded for this contract yet.
        </div>
      ) : (
        <ul className="flex-1 overflow-auto space-y-2" data-testid="snapshot-history-list">
          {orderedSnapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              className="rounded border border-gray-800 bg-gray-900/40 p-3 text-sm"
              data-testid="snapshot-history-item"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold break-all">
                  {snapshot.label ?? 'Unlabeled snapshot'}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {countSnapshotEntries(snapshot)} entries
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {formatSnapshotTime(snapshot.timestamp)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
