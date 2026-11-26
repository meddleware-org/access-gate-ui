<script setup lang="ts">
// AdminCap-gated settings for one gate. Each field builds its specific setter PTB via
// @meddleware/access-gate-client and executes it; on success it emits `changed` so the parent
// re-reads the gate's on-chain state.
// Vue, the shared UI components, the formatting helpers, the client's setter builders and this app's own modules.
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

// The component's input and event.
const props = defineProps<{
  /** The gate being administered (supplies gateId + adminCapId + current values). */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

// A unique id prefix.
const id = useId()
// Editable copies of the current on-chain values.
// Editable copies of the gate's current values.
const values = reactive({
  price: mistToSui(props.gate.priceMist),
  recipient: props.gate.paymentRecipient,
  uses: props.gate.defaultUses.toString(),
  name: props.gate.nftName,
  image: props.gate.nftImageUrl,
  description: props.gate.nftDescription,
})
/** The names of the editable fields. */
type Key = keyof typeof values

// Which setting is being saved (one at a time), and the last error.
const busy = ref<string | null>(null)
const error = ref<string | null>(null)

// The admin context every setter transaction needs.
const ctx = () => adminContext(props.gate)

/** The image setter, refusing a URL that is not https or a data:image URI. */
/** buildImageTx(): the image setter, refusing an address that is not https or a data:image URI. */
function buildImageTx(): Transaction {
  const err = imageUrlError(values.image)
  if (err) throw new Error(err)
  return buildSetNftImageUrlTx(ctx(), values.image.trim())
}

/** One editable setting: its key, label, input type, hint, extra attributes and how to build its transaction. */
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
// One row per setting, in screen order; the price row hints at the free-gate fee, and "default credits" is offered only for gates that have credits.
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
  // "Default credits" applies only to gates that have credits.
  if (props.gate.defaultUses > 0n) {
    // The pass's name, image and description are always editable.
    list.push({ key: 'uses', label: 'Default credits', type: 'number', attrs: { min: '1', step: '1' }, build: () => buildSetDefaultUsesTx(ctx(), BigInt(values.uses || '0')) })
  }
  list.push(
    { key: 'name', label: 'Pass name', build: () => buildSetNftNameTx(ctx(), values.name) },
    { key: 'image', label: 'Pass image URL', type: 'url', attrs: { spellcheck: 'false' }, build: buildImageTx },
    { key: 'description', label: 'Pass description', build: () => buildSetNftDescriptionTx(ctx(), values.description) },
  )
  return list
})

/** Build + execute one setter, keyed by what is being changed. */
/** run(what, build): build and execute one setter, then tell the parent to re-read. */
async function run(what: string, build: () => Transaction | Promise<Transaction>): Promise<void> {
  error.value = null
  busy.value = what
  try {
    // Build (validating first) and have the wallet sign and execute.
    await executeTx(await build())
    // Tell the parent to re-read the gate.
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
    <!-- One row per setting: the field and its Update button. -->
    <ul class="rows" role="list">
      <li v-for="f in fields" :key="f.key" class="row">
        <UiTextField :id="`${id}-${f.key}`" v-model="values[f.key]" :label="f.label" :type="f.type ?? 'text'" :hint="f.hint" v-bind="f.attrs" />
        <!-- One Update button per field; all are disabled while any one is saving. -->
        <UiButton variant="secondary" :busy="busy === f.key" :disabled="busy !== null" @click="run(f.key, f.build)">Update</UiButton>
      </li>
    </ul>

    <!-- Two toggles: pause or resume purchases, and whether spent passes are removed. -->
    <p class="toggles">
      <UiButton variant="ghost" :busy="busy === 'paused'" :disabled="busy !== null" @click="run('paused', () => buildSetPausedTx(ctx(), !gate.paused))">
        {{ gate.paused ? 'Unpause purchases' : 'Pause purchases' }}
      </UiButton>
      <UiButton variant="ghost" :busy="busy === 'autoburn'" :disabled="busy !== null" @click="run('autoburn', () => buildSetAutoBurnAtZeroTx(ctx(), !gate.autoBurnAtZero))">
        {{ gate.autoBurnAtZero ? 'Keep spent passes as receipts' : 'Remove passes when their credits reach zero' }}
      </UiButton>
    </p>

    <UiNotice v-if="error" type="error" :message="error" />
  </div>
</template>

<style scoped>
/* The panel is a column. */
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

/* The rows are a plain list with no markers. */
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A field and its button side by side, wrapping on a narrow screen, aligned at the bottom. */
.row {
  display: flex;
  flex-wrap: wrap;
  /* Button aligned with the bottom of the field, not its label. */
  align-items: end;
  gap: var(--space-xs);
}

/* The field takes the spare width. */
.row > :first-child {
  /* The field is at least 14rem wide before it wraps. */
  flex: 1 1 14rem;
}

/* The toggles wrap. */
.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin: 0;
}
</style>
