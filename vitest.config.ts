import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/traceability.test.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
      passWithNoTests: true,
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
