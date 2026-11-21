<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ReadOnlyLines from '../components/ReadOnlyLines.vue'
import TotalsTable from '../components/TotalsTable.vue'
import { formatDate } from '../format'
import { useStore } from '../store'
import NotFoundView from './NotFoundView.vue'

const store = useStore()
const route = useRoute()

// The stored invoice is shown as is; nothing is recalculated.
const invoice = computed(() => store.state.data.invoices.find((i) => i.id === route.params.id))
</script>

<template>
  <NotFoundView v-if="!invoice" />
  <section v-else>
    <h1>請求書</h1>

    <dl class="meta">
      <div>
        <dt>請求書番号</dt>
        <dd data-testid="invoice-number">{{ invoice.number }}</dd>
      </div>
      <div>
        <dt>見積もり番号</dt>
        <dd data-testid="quote-number">{{ invoice.quoteNumber }}</dd>
      </div>
      <div>
        <dt>請求日</dt>
        <dd data-testid="invoiced-on">{{ formatDate(invoice.invoicedOn) }}</dd>
      </div>
      <div>
        <dt>支払期限</dt>
        <dd data-testid="due-on">{{ formatDate(invoice.dueOn) }}</dd>
      </div>
      <div>
        <dt>宛先</dt>
        <dd>{{ invoice.recipient }}</dd>
      </div>
      <div>
        <dt>件名</dt>
        <dd>{{ invoice.subject }}</dd>
      </div>
    </dl>

    <h2>明細</h2>
    <ReadOnlyLines :lines="invoice.lines" />

    <h2>計算結果</h2>
    <TotalsTable :totals="invoice.totals" />

    <p><RouterLink to="/">一覧に戻る</RouterLink></p>
  </section>
</template>
