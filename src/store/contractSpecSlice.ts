import { normalizeContractIdInput } from '../lib/validation/normalizeContractIdInput'
import type { ContractSpecSlice, LensStore } from './types'

function normalizeContractSpecKey(contractId: string): string | null {
  const normalized = normalizeContractIdInput(contractId)
  return normalized.length > 0 ? normalized : null
}

export const createContractSpecSlice = (
  set: (fn: (state: LensStore) => Partial<LensStore>) => void,
  get: () => LensStore,
): ContractSpecSlice => ({
  contractSpecs: {},
  contractSpecErrors: {},

  setContractSpec: (contractId: string, spec: unknown) => {
    const normalizedContractId = normalizeContractSpecKey(contractId)
    if (!normalizedContractId) {
      return
    }

    set((state) => ({
      contractSpecs: {
        ...state.contractSpecs,
        [normalizedContractId]: spec,
      },
      contractSpecErrors: Object.fromEntries(
        Object.entries(state.contractSpecErrors).filter(
          ([key]) => key !== normalizedContractId,
        ),
      ),
    }))
  },

  getContractSpec: (contractId: string) => {
    const normalizedContractId = normalizeContractSpecKey(contractId)
    if (!normalizedContractId) {
      return undefined
    }

    return get().contractSpecs[normalizedContractId]
  },

  setContractSpecError: (contractId: string, error: string) => {
    const normalizedContractId = normalizeContractSpecKey(contractId)
    const normalizedError = error.trim().slice(0, 500)
    if (!normalizedContractId || !normalizedError) return

    set((state) => ({
      contractSpecErrors: {
        ...state.contractSpecErrors,
        [normalizedContractId]: normalizedError,
      },
      contractSpecs: Object.fromEntries(
        Object.entries(state.contractSpecs).filter(
          ([key]) => key !== normalizedContractId,
        ),
      ),
    }))
  },

  getContractSpecError: (contractId: string) => {
    const normalizedContractId = normalizeContractSpecKey(contractId)
    if (!normalizedContractId) return undefined
    return get().contractSpecErrors[normalizedContractId]
  },

  clearContractSpec: (contractId: string) =>
    set((state) => {
      const normalizedContractId = normalizeContractSpecKey(contractId)
      if (!normalizedContractId) {
        return state
      }

      const { [normalizedContractId]: _, ...rest } = state.contractSpecs
      const { [normalizedContractId]: __, ...remainingErrors } =
        state.contractSpecErrors
      return { contractSpecs: rest, contractSpecErrors: remainingErrors }
    }),
})
