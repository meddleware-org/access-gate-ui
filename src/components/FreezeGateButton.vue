<script setup lang="ts">
// Irreversible: make the gate immutable (consumes the AdminCap, permanently ending all setters
// and airdrop). Guarded behind a typed confirmation. A gate whose policy forbids freezing while
// paused shows why instead of offering a transaction that would abort.
import { computed, ref } from 'vue'
import { UiButton, UiNotice } from '@meddleware/ui'
import { buildMakeGateImmutableTx } from '@meddleware/nft-gate-client'
import type { OwnedGate } from '@meddleware/nft-gate-client'
import { adminContext, executeTx, PLATFORM_CONFIG_ID } from '../gates.js'

const props = defineProps<{
  /** The gate to freeze. */
  gate: OwnedGate
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const confirming = ref(false)
const confirmText = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

/** The gate's policy forbids freezing while it is paused (the contract would abort with code 10). */
const blockedByPause = computed(() => Boolean(props.gate.policy?.freezeRequiresUnpaused && props.gate.paused))

async function freeze(): Promise<void> {
  if (confirmText.value !== 'FREEZE') return
  error.value = null
  busy.value = true
  try {
    await executeTx(buildMakeGateImmutableTx(adminContext(props.gate), PLATFORM_CONFIG_ID))
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
    <UiNotice v-if="blockedByPause" type="info">
      This gate can't be frozen while paused (its policy keeps frozen gates purchasable). Unpause it
      first.
    </UiNotice>
    <template v-else-if="!confirming">
      <UiButton variant="danger" @click="confirming = true">Freeze gate (irreversible)</UiButton>
    </template>
    <template v-else>
      <UiNotice type="error">
        Freezing is <strong>permanent</strong>: it destroys the AdminCap and ends all settings and
        airdrops for this gate. Purchases and consumption continue.
        <template v-if="gate.policy?.lockCommissionOnFreeze">
          The current platform commission is locked in for all future purchases.
        </template>
        Type <code>FREEZE</code> to confirm.
      </UiNotice>
      <div class="line">
        <label class="field">
          <span class="mw-visually-hidden">Type FREEZE to confirm</span>
          <input v-model="confirmText" type="text" placeholder="FREEZE" spellcheck="false" />
        </label>
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
