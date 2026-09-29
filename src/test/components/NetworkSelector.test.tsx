import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NetworkSelector from '../../components/global/NetworkSelector'
import * as testConnection from '../../lib/network/testConnection'
import { resetStore, useLensStore } from '../../store/lensStore'
import { DEFAULT_NETWORKS } from '../../store/types'

describe('NetworkSelector Component', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders with default preset network', () => {
    render(<NetworkSelector />)
    expect(screen.getByRole('button', { name: /select network/i })).toBeTruthy()
    expect(screen.getByText('Futurenet')).toBeTruthy()
  })

  it('opens dropdown and switches to preset network', () => {
    render(<NetworkSelector />)

    const trigger = screen.getByRole('button', { name: /select network/i })
    fireEvent.click(trigger)

    const mainnetOption = screen.getByRole('option', { name: /mainnet/i })
    fireEvent.click(mainnetOption)

    const state = useLensStore.getState()
    expect(state.networkConfig).toEqual(DEFAULT_NETWORKS.mainnet)
  })

  it('opens custom panel and captures custom url and network passphrase on apply', () => {
    render(<NetworkSelector />)

    const trigger = screen.getByRole('button', { name: /select network/i })
    fireEvent.click(trigger)

    const customOption = screen.getByRole('option', { name: /custom/i })
    fireEvent.click(customOption)

    expect(screen.getByText('Custom RPC Configuration')).toBeTruthy()

    const urlInput = screen.getByLabelText('Custom RPC URL input')
    const passphraseInput = screen.getByLabelText(
      'Custom Network Passphrase input',
    )

    fireEvent.change(urlInput, {
      target: { value: 'https://custom-rpc.example.com' },
    })
    fireEvent.change(passphraseInput, {
      target: { value: 'Test SDF Network ; September 2015' },
    })

    const applyButton = screen.getByRole('button', { name: /apply/i })
    fireEvent.click(applyButton)

    const state = useLensStore.getState()
    expect(state.networkConfig).toEqual({
      networkId: 'custom',
      rpcUrl: 'https://custom-rpc.example.com',
      networkPassphrase: 'Test SDF Network ; September 2015',
      horizonUrl: DEFAULT_NETWORKS.futurenet.horizonUrl,
    })
    expect(state.lastCustomUrl).toBe('https://custom-rpc.example.com')
  })

  it('defaults custom network passphrase to Custom Network when left empty', () => {
    render(<NetworkSelector />)

    const trigger = screen.getByRole('button', { name: /select network/i })
    fireEvent.click(trigger)

    const customOption = screen.getByRole('option', { name: /custom/i })
    fireEvent.click(customOption)

    const urlInput = screen.getByLabelText('Custom RPC URL input')
    fireEvent.change(urlInput, {
      target: { value: 'https://custom-rpc2.example.com' },
    })

    const applyButton = screen.getByRole('button', { name: /apply/i })
    fireEvent.click(applyButton)

    const state = useLensStore.getState()
    expect(state.networkConfig.networkPassphrase).toBe('Custom Network')
  })

  it('retries a failed connection test with the current custom URL', async () => {
    const testSpy = vi
      .spyOn(testConnection, 'testRpcConnection')
      .mockResolvedValueOnce({ success: false, error: 'Network error' })
      .mockResolvedValueOnce({ success: true })
    render(<NetworkSelector />)

    fireEvent.click(screen.getByRole('button', { name: /select network/i }))
    fireEvent.click(screen.getByRole('option', { name: /custom/i }))
    fireEvent.change(screen.getByLabelText('Custom RPC URL input'), {
      target: { value: 'https://custom-rpc.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }))
    await screen.findByText('Network error')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByText('Connection successful')

    expect(testSpy).toHaveBeenNthCalledWith(
      2,
      'https://custom-rpc.example.com',
      expect.any(AbortSignal),
    )
  })

  it('aborts an in-flight connection test when the custom panel closes', () => {
    const testSpy = vi
      .spyOn(testConnection, 'testRpcConnection')
      .mockImplementation(() => new Promise(() => {}))
    const { unmount } = render(<NetworkSelector />)

    fireEvent.click(screen.getByRole('button', { name: /select network/i }))
    fireEvent.click(screen.getByRole('option', { name: /custom/i }))
    fireEvent.change(screen.getByLabelText('Custom RPC URL input'), {
      target: { value: 'https://custom-rpc.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }))

    const signal = testSpy.mock.calls[0][1]
    expect(signal?.aborted).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /cancel custom rpc/i }))

    expect(signal?.aborted).toBe(true)
    unmount()
  })

  it('aborts an in-flight connection test when unmounted', () => {
    const testSpy = vi
      .spyOn(testConnection, 'testRpcConnection')
      .mockImplementation(() => new Promise(() => {}))
    const { unmount } = render(<NetworkSelector />)

    fireEvent.click(screen.getByRole('button', { name: /select network/i }))
    fireEvent.click(screen.getByRole('option', { name: /custom/i }))
    fireEvent.change(screen.getByLabelText('Custom RPC URL input'), {
      target: { value: 'https://custom-rpc.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }))

    const signal = testSpy.mock.calls[0][1]
    unmount()

    expect(signal?.aborted).toBe(true)
  })

  it('toggles the dropdown once for native Enter activation', () => {
    render(<NetworkSelector />)

    const trigger = screen.getByRole('button', { name: /select network/i })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('toggles the dropdown once for native Space activation', () => {
    render(<NetworkSelector />)

    const trigger = screen.getByRole('button', { name: /select network/i })
    fireEvent.keyDown(trigger, { key: ' ' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(trigger, { key: ' ' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
