import js from '@eslint/js';
import ts from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

// Folders under src/ and the folders each one may import at runtime.
// Type-only imports are allowed everywhere because they are erased at compile time.
// src/main.ts is the entry point and may import anything.
const LAYERS = {
  config: ['debug'],
  types: ['config'],
  utils: ['config', 'types', 'debug'],
  components: ['config', 'types'],
  path: ['config', 'types'],
  customMaps: ['config', 'types', 'path'],
  debug: ['config', 'types', 'utils', 'path', 'renderers'],
  core: ['config', 'types', 'utils', 'customMaps', 'managers', 'ui'],
  objects: ['config', 'types', 'components', 'utils', 'renderers', 'core'],
  renderers: ['config', 'types', 'components', 'utils', 'objects', 'path'],
  managers: [
    'config',
    'types',
    'components',
    'utils',
    'objects',
    'renderers',
    'core',
    'customMaps',
    'debug',
    'path',
  ],
  ui: ['config', 'types', 'components', 'utils', 'objects', 'managers', 'renderers', 'customMaps'],
};

const element = type => ({ element: { type } });

export default [
  js.configs.recommended,
  ...ts.configs.recommended,

  // Base configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: ts.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Disable unused vars for underscore-prefixed parameters
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Disable explicit any warnings (keep for awareness)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Boundary rules - enforce architectural layer dependencies
  {
    files: ['src/**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      // Without a TypeScript resolver, extensionless and aliased imports are not checked
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*.ts'],
      'boundaries/elements': Object.keys(LAYERS).map(type => ({
        type,
        pattern: `src/${type}`,
      })),
      'boundaries/files': [{ pattern: 'src/main.ts', category: 'main' }],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            ...Object.entries(LAYERS).map(([from, to]) => ({
              from: element(from),
              allow: { to: { element: { types: to } } },
            })),
            { from: { file: { categories: 'main' } }, allow: { to: { element: { type: '*' } } } },
            { allow: { dependency: { kind: 'type' } } },
          ],
        },
      ],
      // Every file and local import must belong to a layer above
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
    },
  },

  // Ignore patterns
  {
    ignores: ['dist/**/*', 'node_modules/**/*', '**/*.test.ts', 'tests/**/*', '**/*.d.ts'],
  },
];
