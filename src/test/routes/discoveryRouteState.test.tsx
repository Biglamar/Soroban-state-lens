import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { dedupeExplorerKeys } from '../../routes/contracts/$contractId/explorer'
import {
  DiscoveryInput,
  DiscoveryStateView,
  buildDiscoveryExplorerLocation,
  buildDiscoveryLoadState,
  parseDiscoveryArguments,
} from '../../routes/contracts/$contractId/discovery'

vi.mock('@stellar/design-system', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    size,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: 'button' | 'submit'
    size?: string
  }) => (
    <button onClick={onClick} disabled={disabled} type={type} data-size={size}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Heading: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  IconButton: ({
    altText,
    onClick,
    'aria-label': ariaLabel,
  }: {
    altText?: string
    onClick?: () => void
    'aria-label'?: string
  }) => (
    <button
      aria-label={ariaLabel ?? altText ?? 'icon-button'}
      onClick={onClick}
    >
      {altText ?? 'icon'}
    </button>
  ),
}))

describe('discovery route state', () => {
  it('renders loading, empty, error, and success states from route data', () => {
    const retry = vi.fn()

    const { rerender } = render(
      <DiscoveryStateView
        state={buildDiscoveryLoadState({ status: 'loading' })}
        onRetry={retry}
      />,
    )
    expect(screen.getByText('Loading discovered keys…')).toBeTruthy()

    rerender(
      <DiscoveryStateView
        state={buildDiscoveryLoadState({
          status: 'empty',
          requestedKeyCount: 0,
        })}
        onRetry={retry}
      />,
    )
    expect(screen.getByText(/No keys discovered yet/i)).toBeTruthy()

    rerender(
      <DiscoveryStateView
        state={buildDiscoveryLoadState({
          status: 'error',
          error: 'Network failure',
          requestedKeyCount: 3,
        })}
        onRetry={retry}
      />,
    )
    expect(screen.getByText('Network failure')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)

    rerender(
      <DiscoveryStateView
        state={buildDiscoveryLoadState({
          status: 'success',
          keys: [
            { keyPath: '/contracts/key1', type: 'ContractData' },
            { keyPath: '/contracts/key1', type: 'ContractData' },
          ],
          requestedKeyCount: 2,
        })}
        onRetry={retry}
      />,
    )
    expect(screen.getByText('/contracts/key1')).toBeTruthy()
    expect(
      screen.getAllByRole('button', { name: 'Add to watchlist' }),
    ).toHaveLength(1)
  })

  it('deduplicates explorer keys while preserving first-seen order', () => {
    expect(dedupeExplorerKeys('a, b, a, c, , b')).toBe('a,b,c')
    expect(dedupeExplorerKeys('  zzz ,  aaa , zzz , aaa  ')).toBe('zzz,aaa')
  })

  it('shows JSON argument errors and preserves parsed arguments', () => {
    expect(parseDiscoveryArguments('{')).toEqual({
      args: null,
      error: 'Enter valid JSON arguments.',
    })
    expect(parseDiscoveryArguments('{"value":1}').error).toBe(
      'Arguments must be a JSON array.',
    )
    expect(parseDiscoveryArguments('["hello", 7, true]')).toEqual({
      args: ['hello', 7, true],
      error: null,
    })
  })

  it('keeps submit disabled for malformed arguments and submits parsed values', () => {
    const discover = vi.fn()
    render(<DiscoveryInput isSubmitting={false} onDiscover={discover} />)
    fireEvent.change(screen.getByLabelText('Source account'), {
      target: {
        value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      },
    })
    fireEvent.change(screen.getByLabelText('Contract method'), {
      target: { value: 'read' },
    })
    const argumentsInput = screen.getByLabelText('JSON arguments')
    fireEvent.change(argumentsInput, { target: { value: '[broken' } })

    expect(screen.getByRole('alert').textContent).toBe(
      'Enter valid JSON arguments.',
    )
    expect(
      screen
        .getByRole('button', { name: 'Discover keys' })
        .getAttribute('disabled'),
    ).not.toBeNull()

    fireEvent.change(argumentsInput, {
      target: { value: '["hello", 7, true]' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Discover keys' }))
    expect(discover).toHaveBeenCalledWith({
      sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      functionName: 'read',
      args: ['hello', 7, true],
    })
  })

  it('renders ordered footprint groups and opens the selected explorer key', () => {
    const openKey = vi.fn()
    render(
      <DiscoveryStateView
        state={buildDiscoveryLoadState({
          status: 'success',
          keys: [
            { keyPath: 'read-z', type: 'Read-only' },
            { keyPath: 'read-a', type: 'Read-only' },
            { keyPath: 'write-b', type: 'Read-write' },
          ],
          readOnlyKeys: ['read-a', 'read-z'],
          readWriteKeys: ['write-b'],
        })}
        onOpenKey={openKey}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Read-only keys' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Read-write keys' }),
    ).toBeTruthy()
    const openButtons = screen.getAllByRole('button', {
      name: 'Open in Explorer',
    })
    fireEvent.click(openButtons[0])
    expect(openKey).toHaveBeenCalledWith('read-a')
    expect(buildDiscoveryExplorerLocation('C123', 'read-a')).toEqual({
      to: '/contracts/$contractId/explorer',
      params: { contractId: 'C123' },
      search: { keys: 'read-a' },
    })
  })
})
