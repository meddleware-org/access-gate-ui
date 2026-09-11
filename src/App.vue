<script setup lang="ts">
// Standalone shell for the Access Gate SPA: app header + footer wrapping the core tool view.
// The core UI lives in AccessGateView.vue (also exported for inline embedding in the dashboard).
import {
  AppHeader, AppFooter, ColorModeControl, UiButton, CopyableAddress, ExplorerLink,
  suiExplorerUrl, useColorMode,
} from '@meddleware/ui'
import { useWallet } from './wallet.js'
import { NETWORK } from './config.js'
import AccessGateView from './components/AccessGateView.vue'

const { mode, set } = useColorMode('dark')
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
        <span>Access Gate</span>
      </template>
      <template #actions>
        <template v-if="account">
          <CopyableAddress :address="account.address">
            <ExplorerLink :href="suiExplorerUrl('account', account.address, NETWORK)" :value="account.address" />
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

    <AccessGateView />

    <AppFooter />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

</style>
