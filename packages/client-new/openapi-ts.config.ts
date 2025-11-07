import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './src/api.yml',
  output: {
    path: './src/generated',
    format: 'prettier',
    lint: 'eslint',
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@hey-api/client-fetch',
  ],
});
