import type { Node } from '../../types/node'

export type FlatTreeRowKind = Node['kind']

export interface FlatTreeRow {
  id: string
  parentId: string | null
  depth: number
  keyPath: string
  label: string
  kind: FlatTreeRowKind
  hasChildren: boolean
  childCount: number
  node: Node
  expired?: boolean
}

export interface FlattenTreeRoot {
  id: string
  label: string
  node: Node
  expired?: boolean
}
