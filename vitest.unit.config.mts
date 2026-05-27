import { defineConfig, type Plugin } from 'vitest/config';

const htmlAsText: Plugin = {
  name: 'html-as-text',
  transform(code, id) {
    if (id.endsWith('.html')) return `export default ${JSON.stringify(code)}`;
  },
};

export default defineConfig({
  plugins: [htmlAsText],
  test: {
    environment: 'node',
    include: ['test/unit/**/*.spec.ts'],
  },
});
