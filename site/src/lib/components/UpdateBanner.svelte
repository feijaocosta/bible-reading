<script>
  // "Nova versão disponível": shown when a newer deploy exists. SvelteKit compares the running version
  // with _app/version.json, which the service worker never caches. Checked right after opening, when
  // the app returns to the foreground, and every 5 minutes (svelte.config.js). "Atualizar" reloads.
  import { updated } from '$app/state';
  import { onMount } from 'svelte';
  import { t } from '$lib/strings.js';
  import { track } from '$lib/analytics.js';
  import Icon from './Icon.svelte';

  function check() {
    updated.check().catch(() => {});
    // Also ask the browser to look for a new service worker now, instead of waiting up to a day.
    navigator.serviceWorker?.getRegistration().then((reg) => reg?.update()).catch(() => {});
  }

  onMount(() => {
    const timer = setTimeout(check, 1500);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  });

  function reload() {
    track('app_update');
    location.reload();
  }
</script>

{#if updated.current}
  <div class="update" role="status">
    <Icon name="refresh" size={18} color="#FFF6EE" />
    <span>{t.updateAvailable}</span>
    <button onclick={reload}>{t.update}</button>
  </div>
{/if}

<style>
  .update { position: fixed; z-index: 40; top: calc(10px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px); display: flex; align-items: center; gap: 10px; background: #4A3230; color: #FFF6EE; padding: 8px 8px 8px 14px; border-radius: 999px; box-shadow: 0 8px 20px rgba(0, 0, 0, .25); font-size: 14px; }
  button { background: var(--rose-soft); color: #fff; border-radius: 999px; padding: 6px 14px; font-weight: 600; }
</style>
