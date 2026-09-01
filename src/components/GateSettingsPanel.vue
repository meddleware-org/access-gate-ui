<script setup lang="ts">
// AdminCap-gated settings for one gate. Each control builds its specific setter PTB via
// @meddleware/nft-gate-client and executes it; on success it emits `changed` so the parent
// re-reads the gate's on-chain state.
import { ref } from 'vue'
import type { Transaction } from '@mysten/sui/transactions'
import { UiButton, UiNotice } from '@meddleware/ui'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import {
  buildSetPriceTx,
  buildSetPaymentRecipientTx,
  buildSetPausedTx,
  buildSetDefaultUsesTx,
  buildSetSoulboundTx,
  buildSetAutoBurnAtZeroTx,
  buildSetNftNameTx,
  buildSetNftImageUrlTx,
  buildSetNftDescriptionTx,
} from '@meddleware/nft-gate-client'
import { adminContext, executeTx } from '../gates.js'

const props = defineProps<{
  /** The gate being administered (supplies gateId + adminCapId + current values). */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

// Local editable copies seeded from current on-chain state.
const priceSui = ref((Number(props.gate.priceMist) / 1e9).toString())
const paymentRecipient = ref(props.gate.paymentRecipient)
const defaultUses = ref(props.gate.defaultUses.toString())
const nftName = ref(props.gate.nftName)
const nftImageUrl = ref(props.gate.nftImageUrl)
const nftDescription = ref(props.gate.nftDescription)

const busy = ref<string | null>(null)
const error = ref<string | null>(null)

function suiToMist(sui: string): bigint {
  const n = Number(sui)
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid price.')
  return BigInt(Math.round(n * 1e9))
}

/** Build (lazily, so validation errors surface here) + execute one setter, keyed by `field`. */
async function run(field: string, build: () => Transaction): Promise<void> {
  error.value = null
  busy.value = field
  try {
    await executeTx(build())
    emit('changed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = null
  }
}

const ctx = () => adminContext(props.gate)
</script>

<template>
  <div class="settings">
    <div class="row">
      <label>Price (SUI)</label>
      <input v-model="priceSui" type="number" min="0" step="0.000000001" />
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('price', () => buildSetPriceTx(ctx(), suiToMist(priceSui)))">
        {{ busy === 'price' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>Payment recipient</label>
      <input v-model="paymentRecipient" type="text" placeholder="0x…" spellcheck="false" />
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('recipient', () => buildSetPaymentRecipientTx(ctx(), paymentRecipient.trim()))">
        {{ busy === 'recipient' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>Default uses</label>
      <input v-model="defaultUses" type="number" min="0" step="1" />
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('uses', () => buildSetDefaultUsesTx(ctx(), BigInt(defaultUses || '0')))">
        {{ busy === 'uses' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>NFT name</label>
      <input v-model="nftName" type="text" />
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('name', () => buildSetNftNameTx(ctx(), nftName))">
        {{ busy === 'name' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>NFT image URL</label>
      <input v-model="nftImageUrl" type="url" spellcheck="false" />
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('image', () => buildSetNftImageUrlTx(ctx(), nftImageUrl))">
        {{ busy === 'image' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>NFT description</label>
      <input v-model="nftDescription" type="text" />
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('desc', () => buildSetNftDescriptionTx(ctx(), nftDescription))">
        {{ busy === 'desc' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="toggles">
      <UiButton variant="ghost" :disabled="busy !== null" @click="run('paused', () => buildSetPausedTx(ctx(), !gate.paused))">
        {{ gate.paused ? 'Unpause purchases' : 'Pause purchases' }}
      </UiButton>
      <UiButton variant="ghost" :disabled="busy !== null" @click="run('soulbound', () => buildSetSoulboundTx(ctx(), !gate.soulbound))">
        {{ gate.soulbound ? 'Make future NFTs transferable' : 'Make future NFTs soulbound' }}
      </UiButton>
      <UiButton variant="ghost" :disabled="busy !== null" @click="run('autoburn', () => buildSetAutoBurnAtZeroTx(ctx(), !gate.autoBurnAtZero))">
        {{ gate.autoBurnAtZero ? 'Keep spent NFTs as receipts' : 'Auto-burn spent NFTs' }}
      </UiButton>
    </div>

    <UiNotice v-if="error" type="error">{{ error }}</UiNotice>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.row {
  display: grid;
  grid-template-columns: 9rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
}
.row label {
  font-size: 0.85rem;
  color: var(--muted);
}
.row input {
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--mw-radius, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  min-width: 0;
}
.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
