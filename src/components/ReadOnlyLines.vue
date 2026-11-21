<script setup lang="ts">
import { parseInteger } from '../domain/parse'
import type { ItemLine, Line } from '../domain/types'
import { formatYen } from '../format'

defineProps<{ lines: Line[] }>()

const amountOf = (value: string): number => parseInteger(value) ?? 0
const itemAmount = (l: ItemLine): number => amountOf(l.quantity) * amountOf(l.unitPrice)

const quantityText = (value: string): string => {
  const n = parseInteger(value)
  return n === null ? value : n.toLocaleString('ja-JP')
}
</script>

<template>
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
        <tr v-for="line in lines" :key="line.id" data-testid="line-row">
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
