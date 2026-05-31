import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Prévention de l'incident du 2026-04-24 (1.2M requêtes Vercel) :
      // bannir les handlers onError inline qui réassignent `src` sans garde-fou,
      // ce qui peut provoquer une boucle infinie si la cible échoue aussi.
      // Utiliser plutôt `import { handleImageError } from '@/utils/imageFallback'`.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='onError'] ArrowFunctionExpression AssignmentExpression[left.property.name='src']",
          message:
            'onError inline interdit : utilise handleImageError depuis src/utils/imageFallback.ts (incident Vercel 2026-04-24, 1.2M requetes).',
        },
        {
          selector:
            "JSXAttribute[name.name='onError'] FunctionExpression AssignmentExpression[left.property.name='src']",
          message:
            'onError inline interdit : utilise handleImageError depuis src/utils/imageFallback.ts (incident Vercel 2026-04-24, 1.2M requetes).',
        },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
]);
