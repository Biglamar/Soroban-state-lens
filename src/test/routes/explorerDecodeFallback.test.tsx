import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DecodeFallbackList } from '../../routes/contracts/$contractId/explorer'
import type { LedgerEntry } from '../../store/types'

vi.mock('@stellar/design-system', () => ({
  Button: (props: any) => <button {...props} />,
  Card: (props: any) => <div {...props}>{props.children}</div>,
  Heading: (props: any) => <div {...props}>{props.children}</div>,
}))

describe('Explorer decode fallback', () => {
  it('shows the decoder fallback reason beside the raw XDR', () => {
    const entry: LedgerEntry = {
      key: 'CONTRACT::Other::fallback-key',
      contractId: 'CONTRACT',
      type: 'Other',
      value: 'AAAA-invalid-xdr',
      lastModifiedLedger: 1,
      rawXdr: 'AAAA-invalid-xdr',
      decodeErrorReason: 'Malformed ScVal XDR',
    }

    render(<DecodeFallbackList entries={[entry]} />)

    expect(
      screen.getByRole('region', { name: 'Decode fallbacks' }),
    ).toBeTruthy()
    expect(
      screen.getByText('Decode fallback: Malformed ScVal XDR'),
    ).toBeTruthy()
    expect(screen.getByText('AAAA-invalid-xdr')).toBeTruthy()
  })
})
