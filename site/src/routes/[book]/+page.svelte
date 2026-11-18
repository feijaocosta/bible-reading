<script>
  import { base } from '$app/paths';
  import { t } from '$lib/strings.js';
  import { sharePage } from '$lib/share.js';
  import { toast } from '$lib/toast.svelte.js';
  import Seo from '$lib/components/Seo.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { downloads } from '$lib/offline.svelte.js';
  import { track } from '$lib/analytics.js';

  let { data } = $props();
  const b = $derived(data.book);
  async function share() {
    const result = await sharePage({ title: `${b.name} · ${t.appName}`, text: `${b.name}: leituras em áudio` });
    if (result === 'copied') toast.show(t.shareCopied);
    if (result !== 'cancelled') track('share', { content_type: 'book', item_id: b.slug, method: result });
  }

  // A part counts as offline when at least one of its readings is downloaded on this device.
  const isSaved = (part, chapter = null) => b.readings.some((r) => r.part === part && r.chapter === chapter && downloads.has(r));

  // Whole-book download (every reading of the book, all narrators).
  const withAudio = $derived(b.readings.filter((r) => r.audioUrl));
  const missing = $derived(withAudio.filter((r) => !downloads.has(r)));
  // 64 kbps ≈ 8 kB per second of audio.
  const aboutMb = $derived(Math.max(1, Math.round(missing.reduce((s, r) => s + (r.durationSec || 0), 0) * 8000 / 1024 ** 2)));
  const busy = $derived(downloads.batch?.label === b.name);
  async function downloadBook() {
    const failed = await downloads.addMany(missing, b.name);
    toast.show(failed ? t.someFailed(failed) : t.bookDownloaded, 4000);
  }
</script>

<Seo title={b.name} description="{b.name} ({t.testaments[b.testament]}): {t.progressRead(b.done, b.total)}." />

<main class="page">
  <div class="wash" style="height:210px"><img src="{base}/art/header.svg" alt="" /></div>
  <nav class="topbar">
    <a class="icon-btn" href="{base}/" aria-label={t.back}><Icon name="back" size={20} /></a>
    <button class="icon-btn" onclick={share} aria-label={t.share}><Icon name="share" size={20} /></button>
  </nav>
  <header class="head">
    <p class="testament">{t.testaments[b.testament]}</p>
    <h1 class="script title">{b.name}</h1>
  </header>

  <div class="section">
    <p class="label">{t.progressRead(b.done, b.total)}</p>
    <div class="chips">
      {#if b.intro}<a class="chip on serif" href="{base}{b.intro}" aria-label="{t.intro}{isSaved('intro') ? `, ${t.offline}` : ''}">{t.intro}{#if isSaved('intro')}<span class="saved" aria-hidden="true"><Icon name="check" size={11} /></span>{/if}</a>{:else}<span class="chip off serif" aria-disabled="true">{t.intro}</span>{/if}
      {#if b.closing}<a class="chip on serif" href="{base}{b.closing}" aria-label="{t.closing}{isSaved('closing') ? `, ${t.offline}` : ''}">{t.closing}{#if isSaved('closing')}<span class="saved" aria-hidden="true"><Icon name="check" size={11} /></span>{/if}</a>{:else}<span class="chip off serif" aria-disabled="true">{t.closing}</span>{/if}
    </div>

    <p class="label">{t.chapters}</p>
    <ol class="grid">
      {#each b.chapters as c (c.n)}
        <li>
          {#if c.available}
            <a class="on serif" href="{base}{c.path}" aria-label="{t.chapterTitle(c.n)}{isSaved('chapter', c.n) ? `, ${t.offline}` : ''}">
              {c.n}{#if isSaved('chapter', c.n)}<span class="saved" aria-hidden="true"><Icon name="check" size={11} /></span>{/if}
            </a>
          {:else}
            <span class="off serif" aria-label="{t.chapterTitle(c.n)}, {t.notRecorded}">{c.n}</span>
          {/if}
        </li>
      {/each}
    </ol>
    <p class="legend muted">
      <span><i class="k-on"></i>{t.withAudio}</span>
      <span><i class="k-off"></i>{t.notRecorded}</span>
      {#if downloads.count}<span><i class="k-saved"><Icon name="check" size={9} /></i>{t.offlineShort}</span>{/if}
    </p>

    {#if downloads.supported && withAudio.length}
      <div class="dl card">
        {#if busy}
          <p class="dl-title">{t.downloadingBook(downloads.batch.done, downloads.batch.total)}</p>
          <span class="progress"><i style="width:{(downloads.batch.done / Math.max(1, downloads.batch.total)) * 100}%"></i></span>
        {:else if missing.length}
          <button class="dl-btn" onclick={downloadBook} disabled={!!downloads.batch}>
            <Icon name="download" />
            <span><span class="dl-title">{missing.length < withAudio.length ? t.downloadRest(missing.length) : t.downloadBook(missing.length)}</span><span class="muted dl-sub">{t.downloadBookAbout(aboutMb)}</span></span>
          </button>
        {:else}
          <p class="dl-title done"><Icon name="check" size={18} /> {t.bookDownloaded}</p>
        {/if}
      </div>
      <a class="to-downloads muted" href="{base}/baixados/">{t.downloadsLink(downloads.count)} ›</a>
    {/if}
  </div>
</main>

<style>
  .head { position: relative; z-index: 1; text-align: center; color: #FFFAF4; text-shadow: 0 2px 14px rgba(120, 45, 45, .45); }
  .testament { margin: 0; font-size: 12px; letter-spacing: .3em; text-transform: uppercase; }
  .title { margin: 0; font-size: clamp(56px, 18vw, 80px); line-height: 1.15; color: #FFFAF4; }
  .section { margin-top: 30px; }
  .chips { display: flex; gap: 10px; }
  .chip { flex: 1; text-align: center; padding: 12px; border-radius: 14px; font-size: 16px; }
  .chip.on { position: relative; background: var(--card); box-shadow: var(--shadow); color: var(--rose); }
  .chip.off { border: 1.5px dashed rgba(67, 48, 44, .22); color: rgba(67, 48, 44, .4); }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 9px; }
  .grid a, .grid span { aspect-ratio: 1; border-radius: 12px; display: grid; place-items: center; font-size: 18px; }
  .grid .on { position: relative; background: var(--rose); color: #fff; box-shadow: 0 4px 10px rgba(169, 70, 78, .35); }
  /* "Downloaded" seal: small cream circle with a sage check, on the tile's corner. */
  .saved { position: absolute; top: -5px; right: -5px; width: 19px; height: 19px; border-radius: 50%; background: #FBF5EA; color: var(--sage); display: grid; place-items: center; box-shadow: 0 1px 4px rgba(67, 48, 44, .3); font-family: Jost, sans-serif; font-style: normal; }
  .saved :global(svg) { stroke-width: 3; }
  .grid .off { border: 1.5px dashed rgba(67, 48, 44, .2); color: rgba(67, 48, 44, .38); }
  .legend { display: flex; gap: 16px; font-size: 12px; margin-top: 14px; }
  .legend i { width: 12px; height: 12px; border-radius: 4px; display: inline-block; vertical-align: -1px; margin-right: 6px; }
  .k-on { background: var(--rose); }
  .k-saved { background: #FBF5EA !important; color: var(--sage); box-shadow: 0 1px 3px rgba(67, 48, 44, .3); border-radius: 50% !important; display: inline-grid !important; place-items: center; }
  .dl { margin-top: 26px; padding: 14px 16px; }
  .dl-btn { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; color: var(--rose); }
  .dl-btn span { display: flex; flex-direction: column; }
  .dl-btn:disabled { opacity: .5; }
  .dl-title { margin: 0 0 8px; font-size: 15px; }
  .dl-btn .dl-title { margin: 0; }
  .dl-sub { font-size: 12px; }
  .done { display: flex; align-items: center; gap: 8px; color: var(--sage); margin: 0; }
  .to-downloads { display: block; text-align: right; font-size: 13px; margin-top: 10px; } .k-off { border: 1.5px dashed rgba(67, 48, 44, .35); }
</style>
