<script>
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { track } from '$lib/analytics.js';
  import { t } from '$lib/strings.js';
  import { formatTime } from '$lib/text.js';
  import { player } from '$lib/player.svelte.js';
  import { downloads } from '$lib/offline.svelte.js';
  import { sharePage } from '$lib/share.js';
  import { toast } from '$lib/toast.svelte.js';
  import Seo from './Seo.svelte';
  import Cover from './Cover.svelte';
  import Icon from './Icon.svelte';
  import ReadingRow from './ReadingRow.svelte';

  let { data } = $props();
  const r = $derived(data.reading);
  const active = $derived(player.isCurrent(r));
  const time = $derived(active ? player.time : 0);
  const duration = $derived(active && player.duration ? player.duration : r.durationSec);
  const pct = $derived(duration ? (time / duration) * 100 : 0);
  const shareUrl = $derived(data.siteUrl ? new URL(data.siteUrl).origin + base + r.path : `${location.origin}${base}${r.path}`);

  async function share() {
    const result = await sharePage({ title: `${r.title} — ${t.readBy}: ${r.narrator}`, text: `${r.title}, ${t.readBy.toLowerCase()} de ${r.narrator}`, url: shareUrl });
    if (result === 'copied') toast.show(t.shareCopied);
    if (result !== 'cancelled') track('share', { content_type: 'reading', item_id: r.id, method: result });
  }

  // Autoplay moved on from this reading: follow it to the next page.
  $effect(() => {
    const adv = player.advanced;
    if (adv && adv.fromId === r.id) goto(`${base}${adv.to.path}`, { noScroll: false, keepFocus: true });
  });
  $effect(() => downloads.remember(r));
  async function toggleDownload() {
    try {
      if (downloads.has(r)) await downloads.remove(r);
      else await downloads.add(r);
    } catch {
      toast.show(t.downloadFailed, 4000);
    }
  }
  function onSeek(event) {
    if (!active) player.play(r, { at: Number(event.currentTarget.value) });
    else player.seek(Number(event.currentTarget.value));
  }
</script>

<!-- /tiago/1/ shows the latest reading of the part, so both URLs point search engines to the specific one. -->
<Seo title={t.readingSeoTitle(r)} description={t.readingSeoDescription(r, t.testaments[r.testament])} canonical={r.path}
  image={r.youtubeId ? `https://i.ytimg.com/vi/${r.youtubeId}/maxresdefault.jpg` : r.coverUrl} />

<main class="page">
  <nav class="topbar">
    <a class="icon-btn" href="{base}/{r.bookSlug}/" aria-label={t.back}><Icon name="back" size={20} /></a>
    <span class="testament">{t.testaments[r.testament]}</span>
    <span class="icon-btn ghost" aria-hidden="true"></span>
  </nav>

  <div class="section">
    {#if r.audioUrl}
      <Cover reading={r} eager class="art" />
    {:else}
      <!-- Older readings published before the app audio existed: play the video instead. -->
      <div class="art video">
        <iframe src="https://www.youtube-nocookie.com/embed/{r.youtubeId}?rel=0" title={r.title} allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
    {/if}

    <header class="titles">
      <h1><span class="script bk">{r.book}</span><span class="serif ch">{r.partLabel}</span></h1>
      <p class="nr">{t.readBy}: <a href="{base}{r.narratorPath}">{r.narrator}</a></p>
    </header>

    {#if r.audioUrl}
      <div class="seek">
        <label class="visually-hidden" for="seek">Posição</label>
        <input id="seek" type="range" min="0" max={Math.round(duration) || 1} step="1" value={Math.round(time)} oninput={onSeek} style="--pct:{pct}%" />
        <div class="times muted"><span>{formatTime(time)}</span><span>-{formatTime(duration - time)}</span></div>
      </div>
      <div class="controls">
        <button class="speed" onclick={() => player.cycleSpeed()} aria-label={t.speed(player.speed)}>{String(player.speed).replace('.', ',')}x</button>
        <button class="skip" onclick={() => (active ? player.skip(-15) : player.play(r))} aria-label={t.back15}><Icon name="back15" size={38} /><small>15</small></button>
        <button class="big" class:busy={active && player.loading} onclick={() => player.toggle(r)} aria-label={active && player.loading ? t.loading : active && player.playing ? t.pause : t.play}>
          {#if active && player.loading}<span class="spinner" aria-hidden="true"></span>{/if}
          <Icon name={active && player.playing ? 'pause' : 'play'} size={32} color="#fff" />
        </button>
        <button class="skip" onclick={() => (active ? player.skip(15) : player.play(r))} aria-label={t.forward15}><Icon name="fwd15" size={38} /><small>15</small></button>
        <button class="speed auto" class:on={player.autoplay} onclick={() => player.toggleAutoplay()} aria-pressed={player.autoplay} aria-label={player.autoplay ? t.autoplayOn : t.autoplayOff} title={player.autoplay ? t.autoplayOn : t.autoplayOff}>
          <Icon name="autoplay" size={20} />
        </button>
      </div>
      {#if player.autoplay}<p class="auto-note muted">{t.autoplayOn}</p>{/if}
      {#if active && player.failed}
        <p class="failed" role="alert">{t.playFailed} <button onclick={() => player.retry()}>{t.tryAgain}</button></p>
      {/if}
    {:else}
      <p class="muted center">{t.videoOnly}</p>
    {/if}

    <div class="nav2 serif">
      {#if data.prev}<a href="{base}{data.prev.path}">‹ {data.prev.label}</a>{:else}<span></span>{/if}
      {#if data.next}<a href="{base}{data.next.path}">{data.next.label} ›</a>{/if}
    </div>

    <div class="actions">
      <button class="act card" onclick={share}><Icon name="share" />{t.share}</button>
      {#if r.audioUrl && downloads.supported}
        <button class="act card" class:done={downloads.has(r)} onclick={toggleDownload} disabled={downloads.isBusy(r)} aria-label={downloads.has(r) ? t.removeDownload : t.download}>
          <Icon name={downloads.has(r) ? 'check' : 'download'} />
          {downloads.isBusy(r) ? t.downloading : downloads.has(r) ? t.downloaded : t.download}
        </button>
      {/if}
      {#if r.youtubeId}
        <a class="act card" href="https://www.youtube.com/watch?v={r.youtubeId}" target="_blank" rel="noopener"><Icon name="youtube" />{t.youtube}</a>
      {/if}
    </div>

    {#if data.others.length}
      <p class="label">{t.otherReadings}</p>
      {#each data.others as o (o.id)}<ReadingRow reading={o} />{/each}
    {/if}
  </div>
</main>

<style>
  .testament { font-size: 12px; letter-spacing: .28em; text-transform: uppercase; color: var(--muted); }
  .ghost { opacity: 0; }
  .section :global(.art) { border-radius: 18px; box-shadow: 0 16px 32px rgba(90, 50, 40, .25); margin-top: 6px; }
  .video { aspect-ratio: 16 / 9; overflow: hidden; }
  .video iframe { width: 100%; height: 100%; border: 0; }
  .titles { text-align: center; margin-top: 18px; }
  h1 { margin: 0; font-weight: normal; display: flex; flex-direction: column; }
  .bk { font-size: 58px; line-height: 1.1; }
  .ch { font-weight: 500; font-size: 26px; margin-top: 2px; }
  .nr { font-size: 14px; color: var(--muted); margin: 8px 0 0; }
  .nr a { color: var(--rose); border-bottom: 1px solid currentColor; }
  .seek { margin: 20px 8px 0; }
  input[type='range'] { width: 100%; appearance: none; background: transparent; height: 22px; }
  input[type='range']::-webkit-slider-runnable-track { height: 5px; border-radius: 5px; background: linear-gradient(to right, var(--rose) var(--pct), rgba(169, 70, 78, .2) var(--pct)); }
  input[type='range']::-moz-range-track { height: 5px; border-radius: 5px; background: rgba(169, 70, 78, .2); }
  input[type='range']::-moz-range-progress { height: 5px; border-radius: 5px; background: var(--rose); }
  input[type='range']::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--rose); margin-top: -6.5px; box-shadow: 0 2px 6px rgba(169, 70, 78, .5); }
  input[type='range']::-moz-range-thumb { width: 18px; height: 18px; border: 0; border-radius: 50%; background: var(--rose); }
  .times { display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; }
  .controls { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 10px; }
  .big { position: relative; width: 78px; height: 78px; border-radius: 50%; background: var(--rose); display: grid; place-items: center; box-shadow: 0 10px 22px rgba(169, 70, 78, .45); }
  .big.busy :global(svg) { opacity: .35; }
  .spinner { position: absolute; inset: 6px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, .35); border-top-color: #fff; animation: spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .speed { width: 50px; height: 34px; border-radius: 999px; background: var(--card); box-shadow: var(--shadow); font-size: 14px; font-weight: 600; color: var(--rose); }
  .speed.auto { display: grid; place-items: center; color: var(--muted); }
  .speed.auto.on { background: var(--rose); color: #fff; }
  .auto-note { text-align: center; font-size: 12px; margin: 10px 0 0; }
  .failed { text-align: center; color: var(--rose); font-size: 14px; margin: 14px 0 0; }
  .failed button { text-decoration: underline; color: inherit; margin-left: 4px; }
  .skip { width: 52px; height: 52px; display: grid; place-items: center; position: relative; }
  .skip small { position: absolute; font-size: 10px; font-weight: 600; margin-top: 3px; }
  .center { text-align: center; }
  .nav2 { display: flex; justify-content: space-between; margin: 20px 2px 0; font-size: 15px; color: var(--muted); }
  .actions { display: flex; gap: 10px; margin-top: 18px; }
  .act { flex: 1; padding: 12px 6px; text-align: center; font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .act.done { color: var(--sage); }
  .act:disabled { opacity: .6; }
</style>
