import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  // eslint-plugin-vue 9 declared globals.browser for every linted file; v10 no
  // longer does, so the runtime environments are declared here instead.
  {
    name: 'app/language-options',
    files: ['**/*.{js,mjs,jsx,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser, // the app runs in a browser, the tests in jsdom
        ...globals.node, // the vite and vitest config files run in Node
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },
  skipFormatting,
]
