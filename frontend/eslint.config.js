import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['build'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } }, sourceType: 'module' },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: 'detect' } },
    rules: { ...react.configs.recommended.rules, ...hooks.configs.recommended.rules, 'react/prop-types': 'off', 'react/react-in-jsx-scope': 'off', 'react/no-unescaped-entities': 'off', 'no-unused-vars': ['warn', { varsIgnorePattern: '^_' }], 'react/jsx-no-target-blank': 'off',
      // Fetch-on-mount is the intended pattern here (no data library); the rule targets derived state.
      'react-hooks/set-state-in-effect': 'off' },
  },
];
