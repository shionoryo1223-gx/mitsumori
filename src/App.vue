<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useStore } from './store'

const store = useStore()
const { state } = store
const router = useRouter()

function resetAll(): void {
  store.reset()
  void router.push('/')
}
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
    <section v-if="state.loadStatus === 'corrupted'">
      <p>保存データを読み込めませんでした。</p>
      <p><button type="button" class="primary" @click="resetAll">データを消して初めからやり直す</button></p>
    </section>
    <RouterView v-else />
  </main>
</template>
