import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://soma.gravicity.ai',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/sandbox/') && !page.includes('/verse/'),
    }),
    preact({ compat: true }),
  ],
  build: {
    assets: 'assets'
  },
  markdown: {
    shikiConfig: {
      // Cycle 17 (s01-7b287c): dual-theme so code blocks adapt to dark/light.
      // Astro+Shiki render with CSS vars (`--shiki-light`, `--shiki-dark`) and
      // a defaultColor:false flag so we control which theme wins via CSS.
      // Then html[data-theme='light'] code { color: var(--shiki-light); ... }
      // overrides the dark default. See Layout.astro for the CSS hook.
      themes: {
        dark: 'github-dark-default',
        light: 'github-light',
      },
      defaultColor: false,
      wrap: false,
    },
  },
});
