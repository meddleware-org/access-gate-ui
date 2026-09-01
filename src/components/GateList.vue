<script setup lang="ts">
// Renders the gates the connected operator administers. Pure presentation — the parent owns the
// data and passes it in; row-level changes bubble up via `changed` so the parent re-fetches.
import { UiNotice } from '@meddleware/ui'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import GateCard from './GateCard.vue'

defineProps<{
  /** Gates the connected wallet administers. */
  gates: OwnedGate[]
  /** Whether the list is currently loading. */
  loading: boolean
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()
</script>

<template>
  <div class="list">
    <p v-if="loading" class="muted">Loading your gates…</p>
    <UiNotice v-else-if="gates.length === 0" type="info">
      You don't administer any gates yet. Create one in the "Create gate" tab.
    </UiNotice>
    <GateCard
      v-for="gate in gates"
      :key="gate.gateId"
      :gate="gate"
      @changed="emit('changed')"
    />
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.muted {
  color: var(--muted);
}
</style>
