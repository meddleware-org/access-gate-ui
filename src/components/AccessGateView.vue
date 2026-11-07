<script setup lang="ts">
// Core Access Gate tool UI (list + create + manage gates), free of any app shell.
// Rendered standalone by access-gate-ui's App.vue and inline by the dashboard. Wallet state
// comes from the shared @meddleware/wallet-adapter singleton (via ./wallet.js): connecting here
// or in any other inline tool view (or the dashboard header) reflects everywhere.
//
// Gate loading is driven by watching the connected account, so it works whether the connection
// is made from this app's own header (standalone) or the dashboard's shared control (embedded).
import { ref, watch } from 'vue'
import { AppTabNav, UiLiveStatus, UiNotice, UiTabPanel, UiToolIntro, type AppTab } from '@meddleware/ui'
import { createGeneration } from '@meddleware/web-utils'
import { WalletGuard } from '@meddleware/wallet-adapter'
import type { OwnedGate } from '@meddleware/access-gate-client'
import { deployed, GATE_POLICY_ERROR, network } from '../config.js'
import { errorMessage, listMyGates } from '../gates.js'
import { useWallet } from '../wallet.js'
import CreateGateForm from './CreateGateForm.vue'
import GateList from './GateList.vue'

const TABS: AppTab[] = [
  { id: 'create', label: 'Create gate' },
  { id: 'gates', label: 'My gates' },
]
const activeTab = ref<string>('create')

function onTabChange(id: string): void {
  activeTab.value = id
  if (id === 'gates') void reloadGates()
}

const { account } = useWallet()

const gates = ref<OwnedGate[]>([])
const loadingGates = ref(false)
const loadError = ref<string | null>(null)

// A slower, older load never overwrites a newer one.
const generation = createGeneration()

async function reloadGates(): Promise<void> {
  const current = generation.begin()
  if (!account.value || !deployed.value) return
  loadingGates.value = true
  loadError.value = null
  try {
    const list = await listMyGates(account.value.address)
    if (current()) gates.value = list
  } catch (e) {
    if (current()) loadError.value = errorMessage(e)
  } finally {
    if (current()) loadingGates.value = false
  }
}

// Load (and clear) gates as the shared wallet connects/disconnects or the network changes —
// independent of where the action originates.
watch(
  [() => account.value?.address ?? null, network],
  ([addr]) => {
    gates.value = []
    loadError.value = null
    if (addr) void reloadGates()
    else generation.invalidate()
  },
  { immediate: true },
)

function onCreated(): void {
  activeTab.value = 'gates'
  void reloadGates()
}
</script>

<template>
  <section aria-labelledby="access-gate-title">
    <h2 id="access-gate-title">Access Gate</h2>
    <UiToolIntro>Create and manage on-chain access gates on Sui ({{ network }}).</UiToolIntro>

    <UiNotice v-if="GATE_POLICY_ERROR" type="error" :message="GATE_POLICY_ERROR" />

    <UiNotice v-if="!deployed" type="error" :message="`Access Gate is not available on ${network}. Switch to a network where it is.`" />

    <!-- The tab list and its panel always render (every tab controls a live panel); the wallet
         prompt replaces only the panel's content until a wallet is connected. -->
    <template v-else>
      <AppTabNav :tabs="TABS" :model-value="activeTab" id-prefix="access-gate" aria-label="Sections" @update:model-value="onTabChange" />

      <UiTabPanel id-prefix="access-gate" :tab="activeTab">
        <WalletGuard message="Connect a Sui wallet to create and manage your access gates." :required-features="['sui:signTransaction']">
          <template v-if="activeTab === 'gates'">
            <UiNotice v-if="loadError" type="error" :message="loadError" />
            <UiLiveStatus label="Your gates" :message="loadingGates ? 'Loading your gates…' : ''" />
            <GateList :gates="gates" :loading="loadingGates" @changed="reloadGates" />
          </template>
          <CreateGateForm v-else-if="account" :address="account.address" @created="onCreated" />
        </WalletGuard>
      </UiTabPanel>
    </template>
  </section>
</template>
