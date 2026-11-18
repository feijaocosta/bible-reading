<script>
  import { base } from '$app/paths';
  import { t } from '$lib/strings.js';
  import { normalize, formatTime } from '$lib/text.js';
  import { player } from '$lib/player.svelte.js';
  import Seo from '$lib/components/Seo.svelte';
  import Cover from '$lib/components/Cover.svelte';
  import Icon from '$lib/components/Icon.svelte';

  let { data } = $props();
  let query = $state('');
  let testament = $state('OT');

  // Start on the testament that has readings, if the Old Testament has none yet.
  $effect.pre(() => { if (!data.shelf.OT.length && data.shelf.NT.length) testament = 'NT'; });

  const results = $derived.by(() => {
    const q = normalize(query);
    if (!q) return null;
    return {
      books: data.index.books.filter((b) => normalize(b.name).includes(q)),
      narrators: data.index.narrators.filter((n) => normalize(n.name).includes(q)),
    };
  });
  const resume = $derived(player.resume);
  const isNew = (r) => Date.now() - new Date(r.publishedAt).getTime() < 7 * 864e5;
</script>

<Seo />

<main class="page">
  <div class="wash" style="height:250px"><img src="{base}/art/hero.svg" alt="" /></div>
  <header class="hero">
    <h1 class="logo"><span class="b">Bíblia</span><span class="s">lida por elas</span></h1>
    <p class="tagline serif">{t.tagline}</p>
  </header>

  <div class="section">
    <label class="search card">
      <Icon name="search" size={18} />
      <span class="visually-hidden">{t.search}</span>
      <input type="search" placeholder={t.search} bind:value={query} autocomplete="off" />
      {#if query}<button onclick={() => (query = '')} aria-label="Limpar"><Icon name="close" size={18} /></button>{/if}
    </label>

    {#if results}
      <div class="results card">
        {#if results.books.length}
          <div class="label">{t.searchBooks}</div>
          {#each results.books as b}<a class="result" href="{base}/{b.slug}/"><span class="script">{b.name}</span><Icon name="chevron" size={18} /></a>{/each}
        {/if}
        {#if results.narrators.length}
          <div class="label">{t.searchNarrators}</div>
          {#each results.narrators as n}<a class="result" href="{base}{n.path}"><span class="serif">{n.name}</span><Icon name="chevron" size={18} /></a>{/each}
        {/if}
        {#if !results.books.length && !results.narrators.length}<p class="muted none">{t.searchNone}</p>{/if}
      </div>
    {:else}
      {#if resume?.reading?.audioUrl}
        <div class="label">{t.continue}</div>
        <div class="continue card">
          <a href="{base}{resume.reading.path}" class="c-link">
            <Cover reading={resume.reading} class="c-thumb" />
            <span class="c-text">
              <span class="serif c-title">{resume.reading.title}</span>
              <span class="muted c-sub">{resume.reading.narrator} · {t.remaining(formatTime((resume.reading.durationSec || 0) - resume.time))}</span>
              <span class="progress"><i style="width:{Math.min(100, (resume.time / (resume.reading.durationSec || 1)) * 100)}%"></i></span>
            </span>
          </a>
          <button class="play-sm" onclick={() => player.play(resume.reading)} aria-label={t.play}><Icon name="play" size={16} color="#fff" /></button>
        </div>
      {/if}

      {#if data.recent.length}
        <div class="label">{t.recent}</div>
        <div class="recent">
          {#each data.recent as r (r.id)}
            <a class="rcard card" href="{base}{r.path}">
              {#if isNew(r)}<span class="new">{t.isNew}</span>{/if}
              <Cover reading={r} class="r-thumb" />
              <span class="serif r-title">{r.title}</span>
              <span class="muted r-sub">{r.narrator} · {formatTime(r.durationSec)}</span>
            </a>
          {/each}
        </div>

        <div class="tabs" role="tablist">
          {#each ['OT', 'NT'] as tt}
            <button role="tab" aria-selected={testament === tt} class:on={testament === tt} onclick={() => (testament = tt)}>{t.testaments[tt]}</button>
          {/each}
        </div>
        <ul class="shelf">
          {#each data.shelf[testament] as b (b.slug)}
            <li><a class="book" href="{base}/{b.slug}/">
              <span class="script name">{b.name}</span>
              <span class="meta muted">{t.progress(b.chaptersDone, b.chapters)}<span class="progress"><i style="width:{(b.chaptersDone / b.chapters) * 100}%"></i></span></span>
              <Icon name="chevron" size={18} />
            </a></li>
          {:else}
            <li class="muted none">{t.empty}</li>
          {/each}
        </ul>
      {:else}
        <p class="muted none">{t.empty}</p>
      {/if}
    {/if}
  </div>
</main>

<style>
  .hero { position: relative; z-index: 1; text-align: center; color: #FFFAF4; padding-top: calc(26px + env(safe-area-inset-top)); text-shadow: 0 2px 14px rgba(120, 45, 45, .45); }
  .logo { margin: 0; font-weight: normal; }
  .logo .b { font-family: Dafoe, cursive; font-size: 74px; line-height: .9; display: block; }
  .logo .s { font-family: Josefin, sans-serif; font-weight: 700; font-size: 15px; letter-spacing: .32em; padding-left: .32em; }
  .tagline { font-size: 14px; margin: 8px 20px 0; text-shadow: 0 1px 8px rgba(120, 45, 45, .5); }
  .search { margin-top: 22px; border-radius: 999px; padding: 4px 16px; display: flex; gap: 10px; align-items: center; color: var(--muted); background: rgba(255, 250, 244, .94); }
  .search input::-webkit-search-cancel-button { display: none; }
  .search input { flex: 1; border: 0; background: none; font: inherit; font-size: 16px; padding: 10px 0; color: var(--ink); outline: none; }
  .results { margin-top: 12px; padding: 4px 16px 12px; }
  .result { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(67, 48, 44, .08); font-size: 18px; }
  .result .script { font-size: 28px; }
  .none { text-align: center; padding: 20px 0; }
  .continue { display: flex; align-items: center; gap: 8px; padding: 10px; }
  .c-link { display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0; }
  .continue :global(.c-thumb) { width: 104px; flex: none; border-radius: 10px; }
  .c-text { display: flex; flex-direction: column; flex: 1; gap: 3px; }
  .c-title { font-size: 17px; } .c-sub { font-size: 13px; }
  .play-sm { width: 44px; height: 44px; border-radius: 50%; background: var(--rose); display: grid; place-items: center; flex: none; }
  .recent { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 20px 10px; margin: 0 -20px; scrollbar-width: none; }
  .rcard { position: relative; width: 178px; flex: none; overflow: hidden; scroll-snap-align: start; display: flex; flex-direction: column; }
  .rcard :global(.r-thumb) { border-radius: 0; }
  .r-title { font-size: 16px; padding: 8px 10px 0; } .r-sub { font-size: 12px; padding: 2px 10px 10px; }
  .new { position: absolute; z-index: 1; margin: 8px; background: var(--rose); color: #fff; font-size: 10px; letter-spacing: .15em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
  .tabs { display: flex; background: rgba(255, 250, 244, .7); border-radius: 999px; padding: 4px; margin-top: 26px; }
  .tabs button { flex: 1; padding: 10px; border-radius: 999px; font-size: 14px; color: var(--muted); }
  .tabs .on { background: var(--rose); color: #fff; }
  .shelf { list-style: none; margin: 6px 0 0; padding: 0; }
  .book { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid rgba(67, 48, 44, .1); }
  .name { font-size: 32px; width: 46%; line-height: 1.2; }
  .meta { flex: 1; font-size: 13px; display: flex; flex-direction: column; gap: 6px; }
</style>
