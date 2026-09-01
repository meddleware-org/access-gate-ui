<script setup lang="ts">
// Create a new access gate. Builds `create_gate` via @meddleware/nft-gate-client under the
// hardcoded Meddleware package (commission enforced), then emits the tx digest on success.
import { ref } from 'vue'
import { UiCard, UiButton, UiNotice } from '@meddleware/ui'
import { buildCreateGateTx } from '@meddleware/nft-gate-client'
import { PACKAGE_ID, executeTx } from '../gates.js'

const props = defineProps<{
  /** Connected operator address; prefilled as the default payment recipient. */
  address: string
}>()
const emit = defineEmits<{ (e: 'created', digest: string): void }>()

const priceSui = ref('0')
const defaultUses = ref('0')
const soulbound = ref(false)
const autoBurnAtZero = ref(false)
const nftName = ref('')
const nftImageUrl = ref('')
const nftDescription = ref('')
const paymentRecipient = ref(props.address)

const submitting = ref(false)
const error = ref<string | null>(null)
const okDigest = ref<string | null>(null)

/** Convert a decimal SUI string to a MIST bigint (1 SUI = 1e9 MIST). */
function suiToMist(sui: string): bigint {
  const n = Number(sui)
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid price.')
  return BigInt(Math.round(n * 1e9))
}

async function submit(): Promise<void> {
  error.value = null
  okDigest.value = null
  submitting.value = true
  try {
    const tx = buildCreateGateTx(PACKAGE_ID, {
      priceMist: suiToMist(priceSui.value),
      paymentRecipient: paymentRecipient.value.trim(),
      defaultUses: BigInt(defaultUses.value || '0'),
      soulbound: soulbound.value,
      autoBurnAtZero: autoBurnAtZero.value,
      nftName: nftName.value,
      nftImageUrl: nftImageUrl.value,
      nftDescription: nftDescription.value,
    })
    const digest = await executeTx(tx)
    okDigest.value = digest
    emit('created', digest)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiCard title="Create a gate">
    <form class="form" @submit.prevent="submit">
      <label class="field">
        <span>Price (SUI)</span>
        <input v-model="priceSui" type="number" min="0" step="0.000000001" inputmode="decimal" />
        <small>0 = free gate.</small>
      </label>

      <label class="field">
        <span>Default uses</span>
        <input v-model="defaultUses" type="number" min="0" step="1" />
        <small>0 = unlimited pass; N = single-use NFT with N uses.</small>
      </label>

      <label class="check">
        <input v-model="soulbound" type="checkbox" />
        <span>Soulbound (non-transferable NFTs)</span>
      </label>

      <label class="check">
        <input v-model="autoBurnAtZero" type="checkbox" />
        <span>Auto-burn single-use NFTs at zero uses</span>
      </label>

      <label class="field">
        <span>Payment recipient</span>
        <input v-model="paymentRecipient" type="text" placeholder="0x…" spellcheck="false" />
        <small>Where purchase revenue is sent (after the platform commission).</small>
      </label>

      <label class="field">
        <span>NFT name</span>
        <input v-model="nftName" type="text" placeholder="My access pass" />
      </label>

      <label class="field">
        <span>NFT image URL</span>
        <input v-model="nftImageUrl" type="url" placeholder="https://…" spellcheck="false" />
      </label>

      <label class="field">
        <span>NFT description</span>
        <input v-model="nftDescription" type="text" placeholder="Grants access to…" />
      </label>

      <UiButton type="submit" :disabled="submitting">
        {{ submitting ? 'Creating…' : 'Create gate' }}
      </UiButton>

      <UiNotice v-if="error" type="error">{{ error }}</UiNotice>
      <UiNotice v-else-if="okDigest" type="ok">Gate created. Tx: {{ okDigest }}</UiNotice>
    </form>
  </UiCard>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field > span {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}
.field input {
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--mw-radius, 8px);
  background: var(--surface);
  color: var(--text);
  font-size: 0.95rem;
}
.field small {
  color: var(--muted);
  font-size: 0.8rem;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
}
</style>
