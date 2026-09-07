<script setup lang="ts">
// Core Access Gate tool UI (list + create + manage gates), free of any app shell.
// Rendered standalone by access-gate-ui's App.vue and inline by the dashboard. Wallet state
// comes from the shared @meddleware/wallet-adapter singleton (via ./wallet.js): connecting here
// or in any other inline tool view (or the dashboard header) reflects everywhere.
//
// Gate loading is driven by watching the connected account, so it works whether the connection
// is made from this app's own header (standalone) or the dashboard's shared control (embedded).
import { ref, watch } from 'vue'
import { UiNotice } from '@meddleware/ui'
import { WalletGuard } from '@meddleware/wallet-adapter'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import { NETWORK } from '../config.js'
import { PACKAGE_ID, listMyGates } from '../gates.js'
import { useWallet } from '../wallet.js'
import CreateGateForm from './CreateGateForm.vue'
import GateList from './GateList.vue'

type Tab = 'create' | 'gates'
const activeTab = ref<Tab>('gates')

const { account } = useWallet()

const gates = ref<OwnedGate[]>([])
const loadingGates = ref(false)
const loadError = ref<string | null>(null)

const deployed = PACKAGE_ID !== ''

async function reloadGates(): Promise<void> {
  if (!account.value || !deployed) return
  loadingGates.value = true
  loadError.value = null
  try {
    gates.value = await listMyGates(account.value.address)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingGates.value = false
  }
}

// Load (and clear) gates as the shared wallet connects/disconnects — independent of where the
// connect action originates.
watch(
  () => account.value?.address ?? null,
  (addr) => {
    if (addr) void reloadGates()
    else gates.value = []
  },
  { immediate: true },
)

function onCreated(): void {
  activeTab.value = 'gates'
  void reloadGates()
}
</script>

<template>
  <div class="page">
    <p class="sub">Create and manage on-chain access gates on Sui ({{ NETWORK }}).</p>

    <UiNotice v-if="!deployed" type="error">
      The access_gate contract is not deployed on {{ NETWORK }}. Switch to a supported network.
    </UiNotice>

    <WalletGuard v-else message="Connect a Sui wallet to create and manage your access gates.">
      <nav class="tabs" aria-label="Sections">
        <button type="button" class="tab" :class="{ active: activeTab === 'gates' }" @click="activeTab = 'gates'; reloadGates()">
          My gates
        </button>
        <button type="button" class="tab" :class="{ active: activeTab === 'create' }" @click="activeTab = 'create'">
          Create gate
        </button>
      </nav>

      <UiNotice v-if="loadError" type="error">{{ loadError }}</UiNotice>

      <section v-if="activeTab === 'gates'">
        <GateList :gates="gates" :loading="loadingGates" @changed="reloadGates" />
      </section>
      <section v-else>
        <CreateGateForm :address="account!.address" @created="onCreated" />
      </section>
    </WalletGuard>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  flex: 1;
}

.sub {
  color: var(--muted);
  margin: 0.25rem 0 1.25rem;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0 0 1rem;
  border-bottom: 2px solid var(--border);
}

.tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.5rem 1rem;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--muted);
}

.tab.active {
  border-bottom-color: var(--accent);
  color: var(--text);
  font-weight: 600;
}
</style>
