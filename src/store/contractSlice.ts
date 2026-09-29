import type { LensStore } from './types'

export type ContractSnapshot = {
  id: string
  label: string
  timestamp: number
  entryCount: number
}

export type ContractSlice = {
  activeContractId: string | null
  selectedKeyPath: string | null
  snapshots: ContractSnapshot[]

  setActiveContractId: (id: string) => void
  clearActiveContractId: () => void
  setSelectedKeyPath: (keyPath: string) => void
  clearSelectedKeyPath: () => void
  setSnapshots: (snapshots: ContractSnapshot[]) => void
  clearSnapshots: () => void
}

export const createContractSlice = (
  set: (fn: (state: LensStore) => Partial<LensStore>) => void,
): ContractSlice => ({
  activeContractId: null,
  selectedKeyPath: null,
  snapshots: [],

  setActiveContractId: (id: string) =>
    set((state) => ({
      activeContractId: id,
      // Reset the selected key path and stale snapshots when switching contracts.
      ...(id !== state.activeContractId
        ? { selectedKeyPath: null, snapshots: [] }
        : {}),
    })),

  clearActiveContractId: () =>
    set(() => ({
      activeContractId: null,
      selectedKeyPath: null,
      snapshots: [],
    })),

  setSelectedKeyPath: (keyPath: string) =>
    set(() => ({
      selectedKeyPath: keyPath,
    })),

  clearSelectedKeyPath: () =>
    set(() => ({
      selectedKeyPath: null,
    })),

  setSnapshots: (snapshots: ContractSnapshot[]) =>
    set(() => ({
      snapshots,
    })),

  clearSnapshots: () =>
    set(() => ({
      snapshots: [],
    })),
})
