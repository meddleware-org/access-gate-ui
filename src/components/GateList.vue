<script setup lang="ts">
// Renders the gates the connected operator administers. Pure presentation — the parent owns the
// data and passes it in; row-level changes bubble up via `changed` so the parent re-fetches.
import { UiEmptyState } from '@meddleware/ui'
import type { OwnedGate } from '@meddleware/access-gate-client'
import GateCard from './GateCard.vue'

defineProps<{
  /** Gates the connected wallet administers. */
  gates: OwnedGate[]
  /** Whether the list is currently loading (the parent announces it). */
  loading: boolean
}>()
defineEmits<{ (e: 'changed'): void }>()
</script>

<template>
  <ul v-if="gates.length" class="list" role="list">
    <GateCard v-for="gate in gates" :key="gate.gateId" :gate="gate" @changed="$emit('changed')" />
  </ul>
  <UiEmptyState v-else-if="!loading">You don't administer any gates yet. Create one in the "Create gate" tab.</UiEmptyState>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
