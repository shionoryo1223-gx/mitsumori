# 見積もり・請求 練習帳

テスト・検証エンジニア職向けに、テストの自動化を見せるためのポートフォリオ作品です。

[![CI](https://github.com/shionoryo1223-gx/mitsumori/actions/workflows/ci.yml/badge.svg)](https://github.com/shionoryo1223-gx/mitsumori/actions/workflows/ci.yml)

公開 URL：https://mitsumori.ichimai.workers.dev

## 資料

- [仕様書](docs/spec.md)
- [テスト計画](docs/test-plan.md)
- [テスト設計](docs/test-design.md)
- [テストケース一覧](tests/cases.csv)
- [Playwright のテストレポート](https://shionoryo1223-gx.github.io/mitsumori/)

## 役割分担

コードとテスト資料の下書きは Claude Code（AI）が作成しました。テストの方針と中身の決定・修正、iPhone 実機での手動テスト、不具合の報告は制作者が行いました。

## 手元での実行

```powershell
npm ci
npm test
npm run e2e
```
