<script setup lang="ts">
import type { Totals } from '../domain/types'
import { formatYen } from '../format'

defineProps<{ totals: Totals }>()
</script>

<template>
  <table class="totals">
    <thead>
      <tr>
        <th scope="col">税率</th>
        <th scope="col">対象額（税抜）</th>
        <th scope="col">税額</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="t in totals.byRate" :key="t.rate">
        <th scope="row">{{ t.rate }}%</th>
        <td :data-testid="`base-${t.rate}`">{{ formatYen(t.base) }}</td>
        <td :data-testid="`tax-${t.rate}`">{{ formatYen(t.tax) }}</td>
      </tr>
      <tr class="grand-total">
        <th scope="row" colspan="2">合計（税込）</th>
        <td data-testid="total">{{ formatYen(totals.total) }}</td>
      </tr>
    </tbody>
  </table>
</template>
