import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://soma.gravicity.ai',
  output: 'static',
  integrations: [sitemap()],
  build: {
    assets: 'assets'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
