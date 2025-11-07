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
    {
      name: '@hey-api/transformers',
      // dates: true would convert date-time strings to Date objects
      // but we have unix timestamps (numbers), so we'll handle them in post-processing
      // bigint: false (default) - natively type BigInts as bigint (what we want!)
    },
    {
      name: '@hey-api/sdk',
      transformer: true, // Enable transformers in SDK methods
    },
    '@hey-api/client-fetch',
  ],
});
