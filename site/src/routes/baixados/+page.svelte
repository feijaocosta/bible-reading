<script>
  // Manage what is saved on this device. The list lives in the browser, so this page renders it client-side.
  import { base } from '$app/paths';
  import { t } from '$lib/strings.js';
  import { formatTime } from '$lib/text.js';
  import { downloads } from '$lib/offline.svelte.js';
  import { player } from '$lib/player.svelte.js';
  import Seo from '$lib/components/Seo.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Cover from '$lib/components/Cover.svelte';

  const mb = (bytes) => (bytes / 1024 ** 2).toFixed(1).replace('.', ',');

  // Grouped by book, in the order the books were downloaded.
  const groups = $derived.by(() => {
    const map = new Map();
    for (const item of downloads.items) {
      const key = item.reading?.book ?? t.unknownReading;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()];
  });

  async function removeAll() {
    if (confirm(t.removeAllConfirm)) await downloads.removeAll();
  }
</script>

<Seo title={t.downloadsTitle} />

<main class="page">
  <div class="wash" style="height:190px"><img src="{base}/art/header-plain.svg" alt="" /></div>
  <nav class="topbar">
    <a class="icon-btn" href="{base}/" aria-label={t.back}><Icon name="back" size={20} /></a>
    <span></span>
  </nav>
  <header class="head">
    <h1 class="script title">{t.downloadsTitle}</h1>
    {#if downloads.count}<p class="usage">{t.downloadsUsage(downloads.count, mb(downloads.totalBytes))}</p>{/if}
  </header>

  <div class="section">
    {#if !downloads.count}
      <p class="empty card muted">{t.downloadsEmpty}</p>
    {:else}
      {#each groups as [book, items] (book)}
        <p class="label">{book}</p>
        {#each items as item (item.id)}
          <div class="row card">
            {#if item.reading}
              <a class="info" href="{base}{item.reading.path}">
                <Cover reading={item.reading} class="thumb" />
                <span class="text">
                  <span class="serif title-r">{item.reading.title}</span>
                  <span class="muted sub">{item.reading.narrator} · {formatTime(item.reading.durationSec)} · {mb(item.bytes)} MB</span>
                </span>
              </a>
              <button class="icon-act" onclick={() => player.toggle(item.reading)} aria-label="{player.isCurrent(item.reading) && player.playing ? t.pause : t.play}: {item.reading.title}">
                <Icon name={player.isCurrent(item.reading) && player.playing ? 'pause' : 'play'} size={18} color="var(--rose)" />
              </button>
            {:else}
              <span class="text"><span class="serif title-r">{t.unknownReading}</span></span>
            {/if}
            <button class="icon-act" onclick={() => downloads.remove(item.reading ?? item)} aria-label="{t.remove}: {item.reading?.title ?? t.unknownReading}">
              <Icon name="trash" size={18} />
            </button>
          </div>
        {/each}
      {/each}
      <button class="remove-all" onclick={removeAll}><Icon name="trash" size={16} /> {t.removeAll}</button>
    {/if}
  </div>
</main>

<style>
  .head { position: relative; z-index: 1; text-align: center; }
  .title { margin: 0; font-size: 64px; color: #FFFAF4; text-shadow: 0 2px 14px rgba(120, 45, 45, .45); line-height: 1.2; }
  .usage { margin: 4px 0 0; color: #FFF6EE; font-size: 13px; letter-spacing: .05em; text-shadow: 0 1px 8px rgba(120, 45, 45, .5); }
  .section { margin-top: 34px; }
  .empty { padding: 18px; text-align: center; line-height: 1.5; }
  .row { display: flex; align-items: center; gap: 6px; padding: 9px; margin-bottom: 10px; }
  .info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .info :global(.thumb) { width: 96px; flex: none; }
  .text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .title-r { font-size: 17px; }
  .sub { font-size: 12px; margin-top: 2px; }
  .icon-act { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; color: var(--muted); flex: none; }
  .remove-all { display: flex; align-items: center; gap: 6px; margin: 20px auto 0; color: var(--rose); font-size: 14px; padding: 10px 16px; }
</style>
