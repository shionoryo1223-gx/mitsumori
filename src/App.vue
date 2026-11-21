<script setup lang="ts">
import { useStore } from './store'

const { state } = useStore()
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-name">mitsumori（仮称）</RouterLink>
    <nav>
      <RouterLink to="/tests">テスト資料</RouterLink>
    </nav>
  </header>
  <p class="notice">ポートフォリオ用の練習アプリです。実際の取引には使えません。</p>
  <p v-if="state.saveFailed" class="save-failed" role="alert">保存できませんでした。</p>
  <main class="page">
    <RouterView />
  </main>
</template>
