<script setup lang="ts">
// AdminCap-gated settings for one gate. Each control builds its specific setter PTB via
// @meddleware/access-gate-client and executes it; on success it emits `changed` so the parent
// re-reads the gate's on-chain state.
import { ref } from 'vue'
import type { Transaction } from '@mysten/sui/transactions'
import { UiButton, UiNotice } from '@meddleware/ui'
import type { OwnedGate } from '@meddleware/access-gate-client'
import {
  buildSetPaymentRecipientTx,
  buildSetPausedTx,
  buildSetDefaultUsesTx,
  buildSetSoulboundTx,
  buildSetAutoBurnAtZeroTx,
  buildSetNftNameTx,
  buildSetNftImageUrlTx,
  buildSetNftDescriptionTx,
} from '@meddleware/access-gate-client'
import { adminContext, buildPriceChangeTx, errorMessage, executeTx } from '../gates.js'
import { imageUrlError } from '../validation.js'
import { mistToSui, suiToMist } from '../pricing.js'

const props = defineProps<{
  /** The gate being administered (supplies gateId + adminCapId + current values). */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

// Local editable copies seeded from current on-chain state.
const priceSui = ref<string | number>(mistToSui(props.gate.priceMist))
const paymentRecipient = ref(props.gate.paymentRecipient)
const defaultUses = ref(props.gate.defaultUses.toString())
const nftName = ref(props.gate.nftName)
const nftImageUrl = ref(props.gate.nftImageUrl)
const nftDescription = ref(props.gate.nftDescription)

const busy = ref<string | null>(null)
const error = ref<string | null>(null)

/** Build (lazily, so validation errors surface here) + execute one setter, keyed by `field`. */
async function run(field: string, build: () => Transaction | Promise<Transaction>): Promise<void> {
  error.value = null
  busy.value = field
  try {
    await executeTx(await build())
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = null
  }
}

const ctx = () => adminContext(props.gate)

/** The image setter, refusing a URL that is not https or a data:image URI. */
function buildImageTx(): Transaction {
  const err = imageUrlError(nftImageUrl.value)
  if (err) throw new Error(err)
  return buildSetNftImageUrlTx(ctx(), nftImageUrl.value.trim())
}
</script>

<template>
  <div class="settings">
    <div class="row">
      <label>
        <span>Price (SUI)</span>
        <input v-model="priceSui" type="number" min="0" step="0.000000001" />
        <small v-if="!gate.freeFeePaid">Setting 0 makes the gate free and pays the one-off free-gate fee.</small>
      </label>
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('price', () => buildPriceChangeTx(gate, suiToMist(priceSui)))">
        {{ busy === 'price' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>
        <span>Payment recipient</span>
        <input v-model="paymentRecipient" type="text" placeholder="0x…" spellcheck="false" />
      </label>
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('recipient', () => buildSetPaymentRecipientTx(ctx(), paymentRecipient.trim()))">
        {{ busy === 'recipient' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>
        <span>Default credits</span>
        <input v-model="defaultUses" type="number" min="0" step="1" />
      </label>
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('uses', () => buildSetDefaultUsesTx(ctx(), BigInt(defaultUses || '0')))">
        {{ busy === 'uses' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>
        <span>NFT name</span>
        <input v-model="nftName" type="text" />
      </label>
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('name', () => buildSetNftNameTx(ctx(), nftName))">
        {{ busy === 'name' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>
        <span>NFT image URL</span>
        <input v-model="nftImageUrl" type="url" spellcheck="false" />
      </label>
      <UiButton variant="secondary" :disabled="busy !== null" @click="run('image', buildImageTx)">
        {{ busy === 'image' ? '…' : 'Update' }}
      </UiButton>
    </div>

    <div class="row">
      <label>
        <span>NFT description</span>
        <input v-model="nftDescription" type="text" />
      </label>
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
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem;
}
/* The input nests inside its label (implicit association); the label lays out its
   caption + control on one line, matching the previous caption/input columns. */
.row label {
  display: grid;
  grid-template-columns: 9rem 1fr;
  align-items: center;
  gap: 0.5rem;
}
.row label > span {
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
