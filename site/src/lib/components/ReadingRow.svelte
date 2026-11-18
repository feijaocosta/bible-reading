<script>
  import { base } from '$app/paths';
  import Cover from './Cover.svelte';
  import Icon from './Icon.svelte';
  import { formatTime } from '$lib/text.js';
  import { downloads } from '$lib/offline.svelte.js';
  let { reading, subtitle } = $props();
</script>

<a class="row card" href="{base}{reading.path}">
  <Cover {reading} class="thumb" />
  <span class="text">
    <span class="title serif">{reading.title}</span>
    <span class="sub">{subtitle ?? reading.narrator} · {formatTime(reading.durationSec)}</span>
  </span>
  {#if downloads.has(reading)}<span class="saved" title="Baixado"><Icon name="check" size={18} /></span>{/if}
</a>

<style>
  .row { display: flex; gap: 12px; align-items: center; padding: 9px; margin-bottom: 10px; }
  .row :global(.thumb) { width: 104px; flex: none; }
  .text { display: flex; flex-direction: column; min-width: 0; }
  .title { font-size: 17px; }
  .sub { font-size: 13px; color: var(--muted); margin-top: 2px; }
  .saved { margin-left: auto; margin-right: 6px; color: var(--sage); }
</style>
