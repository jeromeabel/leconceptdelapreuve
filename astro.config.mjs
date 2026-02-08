// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://leconceptdelapreuve.jeromeabel.net',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@scripts': '/src/scripts'
      }
    }
  },
  adapter: netlify()
});
