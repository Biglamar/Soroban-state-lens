import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TreeRow } from '../../components/explorer/TreeRow'
import { useLensStore } from '../../store/lensStore'
import { BigIntDisplayMode, ByteDisplayMode } from '../../store/types'
import type { FlatTreeRow } from '../../lib/tree/flatTreeRow'
import type { Node } from '../../types/node'

const primitiveNode: Node = {
  kind: 'primitive',
  path: [],
  scType: 'string',
  value: 'hello',
  raw: { switch: 'ScvString' },
}

function makeRow(partial: Partial<FlatTreeRow> = {}): FlatTreeRow {
  return {
    id: 'row-1',
    parentId: null,
    depth: 2,
    keyPath: 'row-1',
    label: 'entry[0].value',
    kind: 'primitive',
    hasChildren: false,
    childCount: 0,
    node: primitiveNode,
    ...partial,
  }
}

describe('TreeRow', () => {
  afterEach(() => {
    useLensStore.getState().resetPreferences()
  })

  it('renders indentation spacer for leaf nodes', () => {
    render(
      <TreeRow
        row={makeRow()}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /toggle/i })).toBeNull()
    expect(screen.getByText('hello')).toBeTruthy()
    expect(screen.getByText('string')).toBeTruthy()
  })

  it('renders expander only for parent rows', () => {
    const row = makeRow({
      hasChildren: true,
      kind: 'vec',
      node: { kind: 'vec', path: [], items: [], raw: { switch: 'ScvVec' } },
    })

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Toggle entry[0].value' }),
    ).toBeTruthy()
    expect(screen.getByText('vec')).toBeTruthy()
    expect(screen.getByText('0 items')).toBeTruthy()
  })

  it('calls activate handler on row click', () => {
    const onActivate = vi.fn()
    const row = makeRow()

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
        onActivate={onActivate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open entry[0].value' }))
    expect(onActivate).toHaveBeenCalledWith(row)
  })

  it('calls activate handler on Enter and Space', () => {
    const onActivate = vi.fn()
    const row = makeRow()

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
        onActivate={onActivate}
      />,
    )

    const button = screen.getByRole('button', { name: 'Open entry[0].value' })
    fireEvent.keyDown(button, { key: 'Enter' })
    fireEvent.keyDown(button, { key: ' ' })

    expect(onActivate).toHaveBeenCalledTimes(2)
    expect(onActivate).toHaveBeenCalledWith(row)
  })

  it('notifies parent on ArrowUp and ArrowDown', () => {
    const onKeyNavigate = vi.fn()
    const row = makeRow()

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
        onKeyNavigate={onKeyNavigate}
      />,
    )

    const button = screen.getByRole('button', { name: 'Open entry[0].value' })
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    fireEvent.keyDown(button, { key: 'ArrowUp' })

    expect(onKeyNavigate).toHaveBeenNthCalledWith(1, 'down')
    expect(onKeyNavigate).toHaveBeenNthCalledWith(2, 'up')
  })

  it('renders byte previews using each display preference', () => {
    const bytes: Node = {
      kind: 'primitive',
      path: [],
      scType: 'bytes',
      value: [72, 105],
      raw: { switch: 'ScvBytes' },
    }
    const row = makeRow({ node: bytes, kind: 'primitive' })

    for (const [mode, expected] of [
      [ByteDisplayMode.HEX, '0x4869'],
      [ByteDisplayMode.BASE64, 'SGk='],
      [ByteDisplayMode.UTF8, 'Hi'],
    ] as const) {
      useLensStore.setState((state) => ({
        preferences: { ...state.preferences, byteDisplayMode: mode },
      }))
      const { unmount } = render(
        <TreeRow
          row={row}
          rowHeight={40}
          isExpanded={false}
          isSelected={false}
        />,
      )
      expect(screen.getByText(expected)).toBeTruthy()
      unmount()
    }
  })

  it('renders big integer previews using each display preference', () => {
    const integer: Node = {
      kind: 'primitive',
      path: [],
      scType: 'i128',
      value: '-12345',
      raw: { switch: 'ScvI128' },
    }
    const row = makeRow({ node: integer, kind: 'primitive' })

    for (const [mode, expected] of [
      [BigIntDisplayMode.DECIMAL, '-12345'],
      [BigIntDisplayMode.HEX, '-0x3039'],
      [BigIntDisplayMode.SCIENTIFIC, '-1.2345e+4'],
    ] as const) {
      useLensStore.setState((state) => ({
        preferences: { ...state.preferences, bigIntDisplayMode: mode },
      }))
      const { unmount } = render(
        <TreeRow
          row={row}
          rowHeight={40}
          isExpanded={false}
          isSelected={false}
        />,
      )
      expect(screen.getByText(expected)).toBeTruthy()
      unmount()
    }
  })

  it('shows the configured collection limit and omitted child count', () => {
    const row = makeRow({
      kind: 'vec',
      node: {
        kind: 'vec',
        path: [],
        items: [],
        childLimit: 1024,
        omittedChildren: 4,
        raw: { switch: 'ScvVec' },
      },
    })

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
      />,
    )

    expect(screen.getByText('0 items (limit 1024, 4 omitted)')).toBeTruthy()
  })

  it('shows omitted map entries in the collection preview', () => {
    const row = makeRow({
      kind: 'map',
      node: {
        kind: 'map',
        path: [],
        entries: [],
        childLimit: 1024,
        omittedChildren: 2,
        raw: { switch: 'ScvMap' },
      },
    })

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
      />,
    )

    expect(screen.getByText('0 entries (limit 1024, 2 omitted)')).toBeTruthy()
  })
})
