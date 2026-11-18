<script>
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { player } from '$lib/player.svelte.js';
  import { t } from '$lib/strings.js';
  import Cover from './Cover.svelte';
  import Icon from './Icon.svelte';

  // Hidden on the page of the reading that is playing (the big player is there),
  // whether it was opened as /tiago/1/ or /tiago/1/daniela-nunes/.
  const visible = $derived(player.current && page.data.reading?.id !== player.current.id);
  const pct = $derived(player.duration ? (player.time / player.duration) * 100 : 0);
</script>

{#if visible}
  <div class="mini" role="region" aria-label={t.nowPlaying}>
    <a class="info" href="{base}{player.current.path}">
      <Cover reading={player.current} class="thumb" />
      <span><span class="t serif">{player.current.title}</span><span class="n">{player.current.narrator}</span></span>
    </a>
    <button class="toggle" class:busy={player.loading} onclick={() => player.toggle()} aria-label={player.loading ? t.loading : player.playing ? t.pause : t.play}>
      {#if player.loading}<span class="spinner" aria-hidden="true"></span>{/if}
      <Icon name={player.playing ? 'pause' : 'play'} size={26} color="#FFF6EE" />
    </button>
    <span class="bar" style="width:{pct}%"></span>
  </div>
{/if}

<style>
  .mini { position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); max-width: 536px; margin: 0 auto; background: #4A3230; color: #FFF6EE; border-radius: 18px; padding: 9px 12px; display: flex; gap: 10px; align-items: center; z-index: 20; box-shadow: 0 10px 24px rgba(0, 0, 0, .3); overflow: hidden; }
  .info { display: flex; gap: 10px; align-items: center; flex: 1; min-width: 0; }
  .info :global(.thumb) { width: 64px; flex: none; border-radius: 8px; }
  .info > span { display: flex; flex-direction: column; min-width: 0; }
  .t { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .n { font-size: 12px; opacity: .75; }
  .toggle { position: relative; width: 44px; height: 44px; display: grid; place-items: center; }
  .toggle.busy :global(svg) { opacity: .35; }
  .spinner { position: absolute; inset: 4px; border-radius: 50%; border: 2.5px solid rgba(255, 246, 238, .3); border-top-color: #FFF6EE; animation: spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .bar { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--rose-soft); }
</style>
