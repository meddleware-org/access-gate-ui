<script setup lang="ts">
import { ref } from 'vue'
import { AppHeader, AppFooter, ColorModeControl, UiButton, UiNotice, useColorMode } from '@meddleware/ui'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import { NETWORK } from './config.js'
import { PACKAGE_ID, listMyGates } from './gates.js'
import { useWallet } from './wallet.js'
import CreateGateForm from './components/CreateGateForm.vue'
import GateList from './components/GateList.vue'

const isEmbedded = new URLSearchParams(window.location.search).has('embedded')
const { mode, set } = useColorMode('dark')

type Tab = 'create' | 'gates'
const activeTab = ref<Tab>('gates')

const { wallets, account, connect, disconnect } = useWallet()

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

async function onConnectFirst(): Promise<void> {
  const w = wallets.value[0]
  if (!w) return
  await connect(w)
  await reloadGates()
}

function onCreated(): void {
  activeTab.value = 'gates'
  void reloadGates()
}
</script>

<template>
  <div class="app" :class="{ 'app--embedded': isEmbedded }">
    <AppHeader v-if="!isEmbedded" variant="dark">
      <template #brand>
        <span>Access Gate</span>
      </template>
      <template #actions>
        <template v-if="account">
          <span class="addr">{{ account.address.slice(0, 8) }}…{{ account.address.slice(-4) }}</span>
          <UiButton variant="ghost" @click="disconnect">Disconnect</UiButton>
        </template>
        <template v-else>
          <UiButton :disabled="!wallets.length" @click="onConnectFirst">
            {{ wallets.length ? 'Connect wallet' : 'No wallet detected' }}
          </UiButton>
        </template>
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <div class="page">
      <p class="sub">Create and manage on-chain access gates on Sui ({{ NETWORK }}).</p>

      <UiNotice v-if="!deployed" type="error">
        The access_gate contract is not deployed on {{ NETWORK }}. Switch to a supported network.
      </UiNotice>

      <template v-else-if="account">
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
          <CreateGateForm :address="account.address" @created="onCreated" />
        </section>
      </template>

      <UiNotice v-else type="info">
        Connect a Sui wallet to create and manage your access gates.
      </UiNotice>
    </div>

    <AppFooter v-if="!isEmbedded" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app--embedded {
  min-height: 100%;
}

.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  flex: 1;
}

.app--embedded .page {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.sub {
  color: var(--muted);
  margin: 0.25rem 0 1.25rem;
}

.addr {
  font-family: monospace;
  font-size: 0.9rem;
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
