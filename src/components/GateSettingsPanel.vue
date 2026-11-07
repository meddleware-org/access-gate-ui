<script setup lang="ts">
// AdminCap-gated settings for one gate. Each field builds its specific setter PTB via
// @meddleware/access-gate-client and executes it; on success it emits `changed` so the parent
// re-reads the gate's on-chain state.
import { computed, reactive, ref, useId } from 'vue'
import type { Transaction } from '@mysten/sui/transactions'
import { UiButton, UiNotice, UiTextField } from '@meddleware/ui'
import { mistToSui, suiToMist } from '@meddleware/web-utils'
import type { OwnedGate } from '@meddleware/access-gate-client'
import {
  buildSetPaymentRecipientTx,
  buildSetPausedTx,
  buildSetDefaultUsesTx,
  buildSetAutoBurnAtZeroTx,
  buildSetNftNameTx,
  buildSetNftImageUrlTx,
  buildSetNftDescriptionTx,
} from '@meddleware/access-gate-client'
import { adminContext, buildPriceChangeTx, errorMessage, executeTx } from '../gates.js'
import { imageUrlError } from '../validation.js'

const props = defineProps<{
  /** The gate being administered (supplies gateId + adminCapId + current values). */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const id = useId()
// Editable copies of the current on-chain values.
const values = reactive({
  price: mistToSui(props.gate.priceMist),
  recipient: props.gate.paymentRecipient,
  uses: props.gate.defaultUses.toString(),
  name: props.gate.nftName,
  image: props.gate.nftImageUrl,
  description: props.gate.nftDescription,
})
type Key = keyof typeof values

const busy = ref<string | null>(null)
const error = ref<string | null>(null)

const ctx = () => adminContext(props.gate)

/** The image setter, refusing a URL that is not https or a data:image URI. */
function buildImageTx(): Transaction {
  const err = imageUrlError(values.image)
  if (err) throw new Error(err)
  return buildSetNftImageUrlTx(ctx(), values.image.trim())
}

interface Field {
  key: Key
  label: string
  type?: 'text' | 'number' | 'url'
  hint?: string
  attrs?: Record<string, string>
  /** Build the setter (lazily, so validation errors surface where the field is). */
  build: () => Transaction | Promise<Transaction>
}

/** One row per setting; the order is the order on the screen. A setting that does not apply to this gate is left out. */
const fields = computed<Field[]>(() => {
  const list: Field[] = [
    {
      key: 'price',
      label: 'Price (SUI)',
      type: 'number',
      attrs: { min: '0', step: '0.000000001' },
      hint: props.gate.freeFeePaid ? undefined : 'Setting 0 makes the gate free and pays the one-off free-gate fee.',
      build: () => buildPriceChangeTx(props.gate, suiToMist(values.price)),
    },
    { key: 'recipient', label: 'Payment recipient', attrs: { placeholder: '0x…', spellcheck: 'false' }, build: () => buildSetPaymentRecipientTx(ctx(), values.recipient.trim()) },
  ]
  if (props.gate.defaultUses > 0n) {
    list.push({ key: 'uses', label: 'Default credits', type: 'number', attrs: { min: '1', step: '1' }, build: () => buildSetDefaultUsesTx(ctx(), BigInt(values.uses || '0')) })
  }
  list.push(
    { key: 'name', label: 'NFT name', build: () => buildSetNftNameTx(ctx(), values.name) },
    { key: 'image', label: 'NFT image URL', type: 'url', attrs: { spellcheck: 'false' }, build: buildImageTx },
    { key: 'description', label: 'NFT description', build: () => buildSetNftDescriptionTx(ctx(), values.description) },
  )
  return list
})

/** Build + execute one setter, keyed by what is being changed. */
async function run(what: string, build: () => Transaction | Promise<Transaction>): Promise<void> {
  error.value = null
  busy.value = what
  try {
    await executeTx(await build())
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="settings">
    <ul class="rows" role="list">
      <li v-for="f in fields" :key="f.key" class="row">
        <UiTextField :id="`${id}-${f.key}`" v-model="values[f.key]" :label="f.label" :type="f.type ?? 'text'" :hint="f.hint" v-bind="f.attrs" />
        <UiButton variant="secondary" :busy="busy === f.key" :disabled="busy !== null" @click="run(f.key, f.build)">Update</UiButton>
      </li>
    </ul>

    <p class="toggles">
      <UiButton variant="ghost" :busy="busy === 'paused'" :disabled="busy !== null" @click="run('paused', () => buildSetPausedTx(ctx(), !gate.paused))">
        {{ gate.paused ? 'Unpause purchases' : 'Pause purchases' }}
      </UiButton>
      <UiButton variant="ghost" :busy="busy === 'autoburn'" :disabled="busy !== null" @click="run('autoburn', () => buildSetAutoBurnAtZeroTx(ctx(), !gate.autoBurnAtZero))">
        {{ gate.autoBurnAtZero ? 'Keep spent NFTs as receipts' : 'Auto-burn spent NFTs' }}
      </UiButton>
    </p>

    <UiNotice v-if="error" type="error" :message="error" />
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--space-xs);
}

.row > :first-child {
  flex: 1 1 14rem;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin: 0;
}
</style>
