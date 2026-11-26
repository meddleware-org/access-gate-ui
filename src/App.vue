<script setup lang="ts">
// Standalone shell for the Access Gate SPA: the shared tool shell (header, colour mode, footer) around the core tool view.
// The core UI lives in AccessGateView.vue (also exported for inline embedding in the dashboard).
// The shared shell and its parts, the explorer link helper, the wallet modal and this app's own modules.
import { AppToolShell, CopyableAddress, ExplorerLink, UiButton } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { WalletModal } from '@meddleware/wallet-adapter'
import { useWallet } from './wallet.js'
import { explorerNetwork } from './config.js'
import AccessGateView from './components/AccessGateView.vue'

// Where the shell's links point: the user and developer documentation, when the build names them.
const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
const DEV_URL = import.meta.env.VITE_DEV_URL || undefined
// The shared wallet: connect (the modal) and disconnect.
const { account, disconnect } = useWallet()
</script>

<template>
  <AppToolShell title="Access Gate" slug="access-gate" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <!-- Header actions: the connected address (with an explorer link) and a disconnect button, or the wallet modal. -->
    <template #actions>
      <template v-if="account">
        <CopyableAddress :address="account.address">
          <ExplorerLink :href="suiExplorerUrl('account', account.address, explorerNetwork)" :value="account.address" />
        </CopyableAddress>
        <UiButton variant="ghost" @click="disconnect">Disconnect</UiButton>
      </template>
      <WalletModal v-else :required-features="['sui:signTransaction']" />
    </template>

    <!-- The tool itself; the dashboard embeds the same view. -->
    <AccessGateView />
  </AppToolShell>
</template>
