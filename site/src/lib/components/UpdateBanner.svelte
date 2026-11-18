<script>
  // "Nova versão disponível": shown when a newer deploy exists (SvelteKit version polling).
  import { updated } from '$app/state';
  import { onMount } from 'svelte';
  import { t } from '$lib/strings.js';
  import { track } from '$lib/analytics.js';
  import Icon from './Icon.svelte';

  // Also check when the app comes back to the foreground (phones keep PWAs open for days).
  onMount(() => {
    const check = () => { if (document.visibilityState === 'visible') updated.check().catch(() => {}); };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
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
