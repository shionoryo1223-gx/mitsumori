<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TotalsTable from '../components/TotalsTable.vue'
import { calculateTotals } from '../domain/calc'
import { addDiscountLine, addItemLine, removeLine } from '../domain/lines'
import { parseInteger } from '../domain/parse'
import type { DiscountLine, ItemLine, Line, Quote, TaxRate } from '../domain/types'
import { countErrors, MAX_LINES, validateQuote } from '../domain/validation'
import { allowedActions, displayStatus } from '../domain/workflow'
import { formatDate, formatYen, statusLabel } from '../format'
import { newId } from '../ids'
import { useStore } from '../store'
import NotFoundView from './NotFoundView.vue'

const store = useStore()
const route = useRoute()
const router = useRouter()

const quote = computed(() => store.state.data.quotes.find((q) => q.id === route.params.id))
// "Today" is refreshed on actions, on tab focus and every minute, so a screen left open past
// the validity date switches to the expired state.
const today = ref(store.today())
const refreshToday = (): void => {
  today.value = store.today()
}
const onVisibility = (): void => {
  if (document.visibilityState === 'visible') refreshToday()
}
let timer: number | undefined
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  timer = window.setInterval(refreshToday, 60_000)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.clearInterval(timer)
})
const status = computed(() => (quote.value ? displayStatus(quote.value, today.value) : 'draft'))
const actions = computed(() =>
  quote.value
    ? allowedActions(quote.value, today.value)
    : { edit: false, delete: false, issue: false, invoice: false },
)
const validation = computed(() => (quote.value ? validateQuote(quote.value) : null))
const errorCount = computed(() => (validation.value ? countErrors(validation.value) : 0))
const totals = computed(() => calculateTotals(quote.value?.lines ?? []))
const atMaxLines = computed(() => (quote.value?.lines.length ?? 0) >= MAX_LINES)

// Field errors are shown only after the field has been blurred once.
const touched = reactive(new Set<string>())
const touchKey = (field: string, lineId = ''): string => `${String(route.params.id)}|${field}|${lineId}`
const touch = (field: string, lineId = ''): void => {
  touched.add(touchKey(field, lineId))
}
const shown = (message: string | undefined, field: string, lineId = ''): string | undefined =>
  touched.has(touchKey(field, lineId)) ? message : undefined

function update(fn: (q: Quote) => Quote): void {
  if (quote.value) store.updateDraft(quote.value.id, fn)
}
function patchLine(lineId: string, patch: Partial<ItemLine> | Partial<DiscountLine>): void {
  update((q) => ({
    ...q,
    lines: q.lines.map((l) => (l.id === lineId ? ({ ...l, ...patch } as Line) : l)),
  }))
}
const inputValue = (e: Event): string => (e.target as HTMLInputElement | HTMLSelectElement).value
const rateOf = (e: Event): TaxRate => (inputValue(e) === '8' ? 8 : 10)

const amountOf = (value: string): number => parseInteger(value) ?? 0
const itemAmount = (l: ItemLine): number => amountOf(l.quantity) * amountOf(l.unitPrice)

const quantityText = (value: string): string => {
  const n = parseInteger(value)
  return n === null ? value : n.toLocaleString('ja-JP')
}

function issue(): void {
  refreshToday()
  if (quote.value) store.issue(quote.value.id)
}
function makeInvoice(): void {
  if (!quote.value) return
  refreshToday()
  const invoiceId = store.invoice(quote.value.id)
  if (invoiceId !== null) void router.push(`/invoices/${invoiceId}`)
  else refreshToday()
}
function remove(): void {
  if (!quote.value) return
  if (!window.confirm('この下書きを削除しますか？')) return
  store.deleteDraft(quote.value.id)
  void router.push('/')
}
function viewInvoice(): void {
  if (quote.value?.invoiceId) void router.push(`/invoices/${quote.value.invoiceId}`)
}
</script>

<template>
  <NotFoundView v-if="!quote" />
  <section v-else>
    <h1>見積もり</h1>
    <p class="status-line">
      状態：<span class="status" data-testid="status">{{ statusLabel(status) }}</span>
    </p>

    <dl v-if="quote.status !== 'draft'" class="meta">
      <div>
        <dt>見積もり番号</dt>
        <dd data-testid="quote-number">{{ quote.number }}</dd>
      </div>
      <div>
        <dt>発行日</dt>
        <dd data-testid="issued-on">{{ quote.issuedOn ? formatDate(quote.issuedOn) : '' }}</dd>
      </div>
      <div>
        <dt>有効期限</dt>
        <dd data-testid="valid-until">{{ quote.validUntil ? formatDate(quote.validUntil) : '' }}</dd>
      </div>
    </dl>

    <!-- Draft: editable -->
    <template v-if="quote.status === 'draft'">
      <div class="field">
        <label :for="`recipient-${quote.id}`">宛先</label>
        <input
          :id="`recipient-${quote.id}`"
          type="text"
          :value="quote.recipient"
          @input="update((q) => ({ ...q, recipient: inputValue($event) }))"
          @blur="touch('recipient')"
        />
        <p v-if="shown(validation?.fields.recipient, 'recipient')" class="field-error">
          {{ validation?.fields.recipient }}
        </p>
      </div>
      <div class="field">
        <label :for="`subject-${quote.id}`">件名</label>
        <input
          :id="`subject-${quote.id}`"
          type="text"
          :value="quote.subject"
          @input="update((q) => ({ ...q, subject: inputValue($event) }))"
          @blur="touch('subject')"
        />
        <p v-if="shown(validation?.fields.subject, 'subject')" class="field-error">
          {{ validation?.fields.subject }}
        </p>
      </div>

      <h2>明細</h2>
      <div class="table-wrap">
        <table class="lines">
          <thead>
            <tr>
              <th scope="col">品名</th>
              <th scope="col">数量</th>
              <th scope="col">単価（税抜）</th>
              <th scope="col">税率</th>
              <th scope="col"><span class="visually-hidden">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in quote.lines" :key="line.id" data-testid="line-row">
              <template v-if="line.kind === 'item'">
                <td>
                  <input
                    type="text"
                    aria-label="品名"
                    :value="line.name"
                    @input="patchLine(line.id, { name: inputValue($event) })"
                    @blur="touch('name', line.id)"
                  />
                  <p v-if="shown(validation?.lines[line.id]?.name, 'name', line.id)" class="field-error">
                    {{ validation?.lines[line.id]?.name }}
                  </p>
                </td>
                <td>
                  <input
                    type="text"
                    inputmode="numeric"
                    aria-label="数量"
                    :value="line.quantity"
                    @input="patchLine(line.id, { quantity: inputValue($event) })"
                    @blur="touch('quantity', line.id)"
                  />
                  <p
                    v-if="shown(validation?.lines[line.id]?.quantity, 'quantity', line.id)"
                    class="field-error"
                  >
                    {{ validation?.lines[line.id]?.quantity }}
                  </p>
                </td>
                <td>
                  <input
                    type="text"
                    inputmode="numeric"
                    aria-label="単価"
                    :value="line.unitPrice"
                    @input="patchLine(line.id, { unitPrice: inputValue($event) })"
                    @blur="touch('unitPrice', line.id)"
                  />
                  <p
                    v-if="shown(validation?.lines[line.id]?.unitPrice, 'unitPrice', line.id)"
                    class="field-error"
                  >
                    {{ validation?.lines[line.id]?.unitPrice }}
                  </p>
                </td>
              </template>
              <template v-else>
                <td class="discount-label">値引き</td>
                <td colspan="2">
                  <input
                    type="text"
                    inputmode="numeric"
                    aria-label="値引き額"
                    :value="line.amount"
                    @input="patchLine(line.id, { amount: inputValue($event) })"
                    @blur="touch('amount', line.id)"
                  />
                  <p v-if="shown(validation?.lines[line.id]?.amount, 'amount', line.id)" class="field-error">
                    {{ validation?.lines[line.id]?.amount }}
                  </p>
                </td>
              </template>
              <td>
                <select
                  aria-label="税率"
                  :value="String(line.taxRate)"
                  @change="patchLine(line.id, { taxRate: rateOf($event) })"
                >
                  <option value="10">10%</option>
                  <option value="8">8%</option>
                </select>
              </td>
              <td>
                <button type="button" @click="update((q) => removeLine(q, line.id))">行を削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul v-if="validation && validation.form.length > 0" class="form-errors">
        <li v-for="message in validation.form" :key="message" class="field-error">{{ message }}</li>
      </ul>
      <p class="button-row">
        <button type="button" :disabled="atMaxLines" @click="update((q) => addItemLine(q, newId()))">
          明細を追加
        </button>
        <button type="button" :disabled="atMaxLines" @click="update((q) => addDiscountLine(q, newId()))">
          値引きを追加
        </button>
      </p>
    </template>

    <!-- Issued / invoiced: plain text -->
    <template v-else>
      <dl class="meta">
        <div>
          <dt>宛先</dt>
          <dd>{{ quote.recipient }}</dd>
        </div>
        <div>
          <dt>件名</dt>
          <dd>{{ quote.subject }}</dd>
        </div>
      </dl>
      <h2>明細</h2>
      <div class="table-wrap">
        <table class="lines">
          <thead>
            <tr>
              <th scope="col">品名</th>
              <th scope="col" class="num">数量</th>
              <th scope="col" class="num">単価（税抜）</th>
              <th scope="col">税率</th>
              <th scope="col" class="num">金額</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in quote.lines" :key="line.id" data-testid="line-row">
              <template v-if="line.kind === 'item'">
                <td>{{ line.name }}</td>
                <td class="num">{{ quantityText(line.quantity) }}</td>
                <td class="num">{{ formatYen(amountOf(line.unitPrice)) }}</td>
                <td>{{ line.taxRate }}%</td>
                <td class="num">{{ formatYen(itemAmount(line)) }}</td>
              </template>
              <template v-else>
                <td colspan="3">値引き</td>
                <td>{{ line.taxRate }}%</td>
                <td class="num">{{ formatYen(-amountOf(line.amount)) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <h2>計算結果</h2>
    <TotalsTable :totals="totals" />

    <div class="actions">
      <template v-if="quote.status === 'draft'">
        <button type="button" class="primary" :disabled="!actions.issue" @click="issue">発行</button>
        <button type="button" @click="remove">削除</button>
        <span v-if="errorCount > 0" class="reason">入力の誤りが {{ errorCount }} 件あります</span>
      </template>
      <template v-else-if="quote.status === 'issued'">
        <button type="button" class="primary" :disabled="!actions.invoice" @click="makeInvoice">
          請求書にする
        </button>
        <span v-if="!actions.invoice" class="reason">有効期限を過ぎたため、請求書にできません</span>
      </template>
      <template v-else>
        <button type="button" class="primary" @click="viewInvoice">請求書を見る</button>
      </template>
    </div>

    <p><RouterLink to="/">一覧に戻る</RouterLink></p>
  </section>
</template>
