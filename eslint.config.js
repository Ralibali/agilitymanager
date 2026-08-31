import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // src/components/ui/** är genererade shadcn/ui-komponenter. De exporterar
    // av design både komponenter och variant-/hook-hjälpare (t.ex.
    // buttonVariants, useFormField, useSidebar) från samma fil. Att bryta ut
    // dessa skulle göra onödig avvikelse från upstream shadcn-mallen och
    // försvåra framtida uppdateringar, så fast-refresh-regeln stängs av
    // scoped till just denna katalog. (Beslut dokumenterat i sprint-rapporten.)
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
