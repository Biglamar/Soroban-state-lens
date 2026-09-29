import { createFileRoute } from '@tanstack/react-router'
import { validateContractRouteParam } from './-validateContractRouteParam'
import { useStore } from '@tanstack/react-store'
import { selectSnapshotsForContract } from '~/store/selectors'
import type { ContractSnapshot } from '~/store/types'

export const Route = createFileRoute(
  ('/contracts/$contractId/history' as unknown) as any,
({
  beforeLoad: ({ params }) => {
    validateContractRouteParam(params.contractId)
  },
  component: ContractHistoryRoute,
})

function formatTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return 'Unknown time'
  }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }
  return date.toLocaleString()
}

function getSnapshotLabel(snapshot: ContractSnapshot): string {
  const label = snapshot.label?.trim()
  return label && label.length > 0 ? label : 'Unlabeled'
}

function getEntryCount(snapshot: ContractSnapshot): number {
  return Object.keys(snapshot.ledgerData ?? {}).length
}

function ContractHistoryRoute() {
  const { contractId } = Route.useParams()
  const id = contractId
  const snapshots = useStore(selectSnapshotsForContract(contractId))

  return (
    <div className="flex flex-col h-full p-6 text-white font-mono">
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
          Contract History
        </p>
        <h1 className="text-lg font-bold break-all">{id}</h1>
      </div>
      {snapshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          No snapshots recorded for this contract.
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-auto">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              className="border border-gray-800 rounded-md p-3 bg-gray-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold break-all">
                  {getSnapshotLabel(snapshot)}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {getEntryCount(snapshot)} entries
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {formatTimestamp(snapshot.timestamp)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
