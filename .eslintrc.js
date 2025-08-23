module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'prettier/prettier': 'error',
    'react/react-in-jsx-scope': 'off', // Inutile avec les nouvelles versions de React
    'react/prop-types': 'off', // On utilise TypeScript pour les props
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
    'react-native/react-native': true,
  },
};
