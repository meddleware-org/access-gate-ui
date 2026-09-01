<script setup lang="ts">
// Irreversible: make the gate immutable (consumes the AdminCap, permanently ending all setters
// and airdrop). Guarded behind a typed confirmation.
import { ref } from 'vue'
import { UiButton, UiNotice } from '@meddleware/ui'
import { buildMakeGateImmutableTx } from '@meddleware/nft-gate-client'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import { adminContext, executeTx } from '../gates.js'

const props = defineProps<{
  /** The gate to freeze. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const confirming = ref(false)
const confirmText = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

async function freeze(): Promise<void> {
  if (confirmText.value !== 'FREEZE') return
  error.value = null
  busy.value = true
  try {
    await executeTx(buildMakeGateImmutableTx(adminContext(props.gate)))
    emit('changed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
    confirming.value = false
    confirmText.value = ''
  }
}
</script>

<template>
  <div class="freeze">
    <template v-if="!confirming">
      <UiButton variant="danger" @click="confirming = true">Freeze gate (irreversible)</UiButton>
    </template>
    <template v-else>
      <UiNotice type="error">
        Freezing is <strong>permanent</strong>: it destroys the AdminCap and ends all settings and
        airdrops for this gate. Purchases and consumption continue. Type <code>FREEZE</code> to confirm.
      </UiNotice>
      <div class="line">
        <input v-model="confirmText" type="text" placeholder="FREEZE" spellcheck="false" />
        <UiButton variant="danger" :disabled="busy || confirmText !== 'FREEZE'" @click="freeze">
          {{ busy ? 'Freezing…' : 'Confirm freeze' }}
        </UiButton>
        <UiButton variant="ghost" :disabled="busy" @click="confirming = false; confirmText = ''">
          Cancel
        </UiButton>
      </div>
      <UiNotice v-if="error" type="error">{{ error }}</UiNotice>
    </template>
  </div>
</template>

<style scoped>
.freeze {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.line input {
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--mw-radius, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
}
</style>
