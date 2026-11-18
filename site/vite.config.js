import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // The catalog and book data live in ../data, outside the site folder.
  server: { fs: { allow: ['..'] } },
});
