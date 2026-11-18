import adapter from '@sveltejs/adapter-static';

// BASE_PATH is "/<repo>" on a GitHub Pages project site (set by the deploy workflow), "" locally.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html', strict: true }),
    paths: { base, relative: false },
    // The app checks for a newer deploy every 5 minutes (and when it comes back to the foreground)
    // and offers to reload, so an open tab never mixes old and new files.
    version: { pollInterval: 5 * 60 * 1000 },
    // With an empty catalog (a fresh install) the dynamic routes have nothing to render yet: just warn.
    prerender: {
      // /audio/ (MP3 + covers) is copied into the build after prerendering (scripts/fetch-media.js).
      handleHttpError: ({ path, message }) => {
        if (path.startsWith(`${base}/audio/`)) return;
        throw new Error(message);
      },
      handleMissingId: 'fail',
      handleUnseenRoutes: 'warn',
    },
  },
};
