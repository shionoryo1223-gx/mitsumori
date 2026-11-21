<script setup lang="ts">
import { useRouter } from 'vue-router'
import { calculateTotals } from '../domain/calc'
import { displayStatus } from '../domain/workflow'
import { formatDate, formatYen, statusLabel } from '../format'
import { useStore } from '../store'

const store = useStore()
const router = useRouter()

function createQuote(): void {
  const id = store.createDraft()
  void router.push(`/quotes/${id}`)
}
</script>

<template>
  <section>
    <h1>見積もり一覧</h1>
    <p><button type="button" class="primary" @click="createQuote">新しい見積もり</button></p>

    <div v-if="store.state.data.quotes.length === 0" class="empty">
      <p>見積もりはまだありません</p>
      <button type="button" @click="store.loadSample()">見本を入れる</button>
    </div>

    <div v-else class="table-wrap">
      <table class="list">
        <thead>
          <tr>
            <th scope="col">状態</th>
            <th scope="col">見積もり番号</th>
            <th scope="col">宛先</th>
            <th scope="col" class="num">合計（税込）</th>
            <th scope="col">発行日</th>
            <th scope="col">有効期限</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in store.state.data.quotes" :key="q.id" data-testid="quote-row">
            <td>{{ statusLabel(displayStatus(q, store.today())) }}</td>
            <td>{{ q.number ?? '—' }}</td>
            <td>
              <RouterLink :to="`/quotes/${q.id}`">{{ q.recipient.trim() === '' ? '（宛先なし）' : q.recipient }}</RouterLink>
            </td>
            <td class="num">{{ formatYen(calculateTotals(q.lines).total) }}</td>
            <td>{{ q.issuedOn ? formatDate(q.issuedOn) : '—' }}</td>
            <td>{{ q.validUntil ? formatDate(q.validUntil) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
