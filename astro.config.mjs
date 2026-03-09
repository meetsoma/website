import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://soma.gravicity.ai',
  output: 'static',
  build: {
    assets: 'assets'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
