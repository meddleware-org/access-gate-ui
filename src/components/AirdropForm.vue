<script setup lang="ts">
// AdminCap-gated free grant of the gate's NFT flavour to an address.
import { ref } from 'vue'
import { UiButton, UiNotice } from '@meddleware/ui'
import { buildAirdropTx } from '@meddleware/nft-gate-client'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import { adminContext, executeTx } from '../gates.js'

const props = defineProps<{
  /** The gate whose NFT flavour is airdropped. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const recipient = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const okDigest = ref<string | null>(null)

async function airdrop(): Promise<void> {
  error.value = null
  okDigest.value = null
  busy.value = true
  try {
    const digest = await executeTx(buildAirdropTx(adminContext(props.gate), recipient.value.trim()))
    okDigest.value = digest
    recipient.value = ''
    emit('changed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="airdrop">
    <label>Airdrop access to</label>
    <div class="line">
      <input v-model="recipient" type="text" placeholder="0x…" spellcheck="false" />
      <UiButton variant="secondary" :disabled="busy || !recipient" @click="airdrop">
        {{ busy ? 'Sending…' : 'Airdrop' }}
      </UiButton>
    </div>
    <UiNotice v-if="error" type="error">{{ error }}</UiNotice>
    <UiNotice v-else-if="okDigest" type="ok">Airdropped. Tx: {{ okDigest }}</UiNotice>
  </div>
</template>

<style scoped>
.airdrop {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.airdrop > label {
  font-size: 0.85rem;
  color: var(--muted);
}
.line {
  display: flex;
  gap: 0.5rem;
}
.line input {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--mw-radius, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
}
</style>
