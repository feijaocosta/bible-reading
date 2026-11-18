<script>
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { t } from '$lib/strings.js';
</script>

<svelte:head><title>{t.notFound} · {t.appName}</title></svelte:head>
<main class="page error">
  <p class="script big">Ops…</p>
  <h1 class="serif">{page.status === 404 ? t.notFound : page.error?.message}</h1>
  <a class="card btn" href="{base}/">{t.home}</a>
</main>

<style>
  .error { text-align: center; padding-top: 18vh; }
  .big { font-size: 72px; margin: 0; }
  h1 { font-weight: 500; font-size: 24px; }
  .btn { display: inline-block; padding: 12px 22px; color: var(--rose); }
</style>
