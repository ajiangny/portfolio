import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['api/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Vercel serverless functions run on Node, not the browser.
    files: ['api/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    // Vite config (incl. the dev-only API middleware) runs on Node.
    files: ['vite.config.js'],
    languageOptions: { globals: globals.node },
  },
])
