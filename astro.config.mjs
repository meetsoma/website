import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://soma.gravicity.ai',
  output: 'static',
  integrations: [
    sitemap(),
    preact({ compat: true }),
  ],
  build: {
    assets: 'assets'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
