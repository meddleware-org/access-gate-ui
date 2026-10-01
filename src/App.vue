<script setup lang="ts">
// Standalone shell for the Access Gate SPA: app header + footer wrapping the core tool view.
// The core UI lives in AccessGateView.vue (also exported for inline embedding in the dashboard).
import {
  AppHeader, AppFooter, ColorModeControl, UiButton, CopyableAddress, ExplorerLink,
  suiExplorerUrl, useColorMode,
} from '@meddleware/ui'
import { useWallet } from './wallet.js'
import { explorerNetwork } from './config.js'
import AccessGateView from './components/AccessGateView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/access-gate/'
const DEV_URL  = import.meta.env.VITE_DEV_URL  || 'https://dev.meddleware.co.uk/sui/access-gate/'
const { wallets, account, connect, disconnect } = useWallet()

async function onConnect(): Promise<void> {
  const w = wallets.value[0]
  if (w) await connect(w)
}
</script>

<template>
  <div class="app">
    <AppHeader variant="dark">
      <template #brand>
        <h1 class="brand-title">Access Gate</h1>
      </template>
      <template #actions>
        <template v-if="account">
          <CopyableAddress :address="account.address">
            <ExplorerLink :href="suiExplorerUrl('account', account.address, explorerNetwork)" :value="account.address" />
          </CopyableAddress>
          <UiButton variant="ghost" @click="disconnect">Disconnect</UiButton>
        </template>
        <template v-else>
          <UiButton :disabled="!wallets.length" @click="onConnect">
            {{ wallets.length ? 'Connect wallet' : 'No wallet detected' }}
          </UiButton>
        </template>
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <main class="app__content">
      <AccessGateView />
    </main>

    <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Centre the tool at the shared tool-content width when running standalone. The dashboard
   supplies its own width container, so this lives in the shell, not AccessGateView. */
.app__content {
  flex: 1;
  width: 100%;
  max-width: var(--mw-tool-content-max);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 1.5rem 1.25rem 4rem;
}

/* The app title is the page's h1; keep the header's own type styles. */
.brand-title {
  font: inherit;
  margin: 0;
}
</style>
