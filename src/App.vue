<script setup lang="ts">
// Standalone shell for the Access Gate SPA: app header + footer wrapping the core tool view.
// The core UI lives in AccessGateView.vue (also exported for inline embedding in the dashboard).
import { AppFooter, AppHeader, ColorModeControl, CopyableAddress, CopyrightLine, ExplorerLink, UiAppShell, UiButton, useColorMode } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { WalletModal } from '@meddleware/wallet-adapter'
import { useWallet } from './wallet.js'
import { explorerNetwork } from './config.js'
import AccessGateView from './components/AccessGateView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/access-gate/'
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://meddleware.dev/sui/access-gate/'
const { account, disconnect } = useWallet()
</script>

<template>
  <UiAppShell contained>
    <template #header>
      <AppHeader variant="dark">
        <template #brand>Access Gate</template>
        <template #actions>
          <template v-if="account">
            <CopyableAddress :address="account.address">
              <ExplorerLink :href="suiExplorerUrl('account', account.address, explorerNetwork)" :value="account.address" />
            </CopyableAddress>
            <UiButton variant="ghost" @click="disconnect">Disconnect</UiButton>
          </template>
          <WalletModal v-else :required-features="['sui:signTransaction']" />
          <ColorModeControl :model-value="mode" @update:model-value="set" />
        </template>
      </AppHeader>
    </template>

    <h1 class="mw-visually-hidden">Access Gate</h1>
    <AccessGateView />

    <template #footer>
      <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL">
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </AppFooter>
    </template>
  </UiAppShell>
</template>
