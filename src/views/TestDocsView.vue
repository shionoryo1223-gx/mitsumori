<script setup lang="ts">
import casesCsv from '../../tests/cases.csv?raw'
import { REPO_URL, REPORT_URL } from '../config'
import { parseCases } from '../lib/cases'

const cases = parseCases(casesCsv)

function countBy(key: 'method' | 'technique'): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of cases) counts.set(c[key], (counts.get(c[key]) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count }))
}

const methodCounts = countBy('method')
const techniqueCounts = countBy('technique')

const steps = [
  '仕様書',
  'テスト計画',
  'テスト設計',
  'テストケース一覧',
  '自動テスト',
  '変更のたびの自動実行',
  '結果レポート・不具合の記録',
]

const docs: { label: string; url: string }[] = [
  { label: '仕様書（docs/spec.md）', url: REPO_URL && `${REPO_URL}/blob/main/docs/spec.md` },
  { label: 'テスト計画（docs/test-plan.md）', url: REPO_URL && `${REPO_URL}/blob/main/docs/test-plan.md` },
  { label: 'テスト設計（docs/test-design.md）', url: REPO_URL && `${REPO_URL}/blob/main/docs/test-design.md` },
  { label: 'テストケース一覧（tests/cases.csv）', url: REPO_URL && `${REPO_URL}/blob/main/tests/cases.csv` },
  { label: '最新の Playwright レポート', url: REPORT_URL },
]
</script>

<template>
  <section class="test-docs">
    <h1>テスト資料</h1>
    <p>
      このアプリは、テストの自動化を見ていただくために作ったポートフォリオ作品です。テスト・検証エンジニアの職への応募のために作りました。
      見積もりから請求書までの小さなアプリを題材に、テスト資料と自動テストを一式そろえています。
    </p>

    <h2>進め方</h2>
    <ol class="flow">
      <li v-for="s in steps" :key="s">{{ s }}</li>
    </ol>
    <p>テスト資料は、アプリのコードを書き始める前に、仕様書をもとに作りました。</p>

    <h2>テストケースの件数</h2>
    <p>
      全部で <strong data-testid="case-total">{{ cases.length }}</strong> 件です（テストケース一覧から数えています）。
    </p>
    <div class="count-grid">
      <div>
        <h3>実施方法ごと</h3>
        <ul data-testid="method-counts">
          <li v-for="m in methodCounts" :key="m.name">{{ m.name }}：{{ m.count }} 件</li>
        </ul>
      </div>
      <div>
        <h3>技法ごと</h3>
        <ul data-testid="technique-counts">
          <li v-for="t in techniqueCounts" :key="t.name">{{ t.name }}：{{ t.count }} 件</li>
        </ul>
      </div>
    </div>

    <h2>資料</h2>
    <ul class="docs">
      <li v-for="d in docs" :key="d.label">
        <a v-if="d.url" :href="d.url" target="_blank" rel="noopener noreferrer">{{ d.label }}</a>
        <template v-else>{{ d.label }}：公開後に追加します</template>
      </li>
    </ul>

    <h2>役割分担</h2>
    <p>
      コードとテスト資料の下書きは Claude Code（AI）が作成しました。テストの方針と中身の決定・修正、iPhone 実機での手動テスト、不具合の報告は制作者が行いました。
    </p>
  </section>
</template>

<style scoped>
h3 {
  font-size: 1rem;
  margin: 0 0 var(--space-1);
}
.flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  padding: 0;
  list-style: none;
  counter-reset: step;
}
.flow li {
  position: relative;
  padding: var(--space-2) var(--space-3);
  background: var(--color-head);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  counter-increment: step;
}
.flow li::before {
  content: counter(step) '. ';
  font-weight: bold;
  color: var(--color-accent);
}
.flow li:not(:last-child)::after {
  content: '↓';
  position: absolute;
  left: var(--space-3);
  bottom: calc(-1 * var(--space-2) - 4px);
  z-index: 1;
  color: var(--color-muted);
  font-size: 0.8rem;
  line-height: 1;
}
.count-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--space-3);
}
.count-grid ul,
.docs {
  margin: 0;
  padding-left: var(--space-4);
}
@media (min-width: 720px) {
  .flow {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: stretch;
  }
  .flow li:not(:last-child)::after {
    content: '→';
    left: auto;
    right: calc(-1 * var(--space-2) - 4px);
    bottom: 50%;
    transform: translateY(50%);
  }
}
</style>
