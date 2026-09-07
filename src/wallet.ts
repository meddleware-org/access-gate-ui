// Thin access-gate-ui shim over the shared @meddleware/wallet-adapter singleton.
//
// The adapter is network-agnostic (RPC URL passed per call); this shim binds access-gate-ui's
// RPC_URLS so call sites keep the one-arg ergonomics (`getSuiClient(NETWORK)` /
// `buildExecutor(NETWORK)`). Because the adapter is a module singleton, the wallet connection is
// shared with any other tool view rendered in the same window (e.g. the dashboard).
import {
  useWallet as useWalletBase,
  getSuiClient as getSuiClientBase,
  buildExecutor as buildExecutorBase,
} from '@meddleware/wallet-adapter'
import type { Executor } from '@meddleware/wallet-adapter'
import type { SuiNetwork } from './config.js'
import { RPC_URLS } from './config.js'

export type { Executor }

/** Memoised Sui JSON-RPC client for the network, using access-gate-ui's configured RPC URL. */
export function getSuiClient(network: SuiNetwork) {
  return getSuiClientBase(network, RPC_URLS[network])
}

/** Build a transaction executor bound to the connected wallet + access-gate-ui's RPC URL. */
export function buildExecutor(network: SuiNetwork): Promise<Executor> {
  return buildExecutorBase(network, RPC_URLS[network])
}

/**
 * Wallet composable bound to access-gate-ui's network config. Delegates to the shared adapter
 * singleton; gate management needs `sui:signTransaction` so it's requested for discovery.
 */
export function useWallet() {
  const base = useWalletBase({ requiredFeatures: ['sui:signTransaction'] })
  return {
    wallets: base.wallets,
    currentWallet: base.currentWallet,
    account: base.account,
    connecting: base.connecting,
    error: base.error,
    connect: base.connect,
    disconnect: base.disconnect,
    getSuiClient,
    buildExecutor,
  }
}
