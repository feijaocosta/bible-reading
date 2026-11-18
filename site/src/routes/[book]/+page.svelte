<script>
  import { base } from '$app/paths';
  import { t } from '$lib/strings.js';
  import { sharePage } from '$lib/share.js';
  import { toast } from '$lib/toast.svelte.js';
  import Seo from '$lib/components/Seo.svelte';
  import Icon from '$lib/components/Icon.svelte';

  let { data } = $props();
  const b = $derived(data.book);
  async function share() {
    if ((await sharePage({ title: `${b.name} · ${t.appName}`, text: `${b.name}: leituras em áudio` })) === 'copied') toast.show(t.shareCopied);
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
      {#if b.intro}<a class="chip on serif" href="{base}{b.intro}">{t.intro}</a>{:else}<span class="chip off serif" aria-disabled="true">{t.intro}</span>{/if}
      {#if b.closing}<a class="chip on serif" href="{base}{b.closing}">{t.closing}</a>{:else}<span class="chip off serif" aria-disabled="true">{t.closing}</span>{/if}
    </div>

    <p class="label">{t.chapters}</p>
    <ol class="grid">
      {#each b.chapters as c (c.n)}
        <li>
          {#if c.available}
            <a class="on serif" href="{base}{c.path}" aria-label={t.chapterTitle(c.n)}>{c.n}</a>
          {:else}
            <span class="off serif" aria-label="{t.chapterTitle(c.n)}, {t.notRecorded}">{c.n}</span>
          {/if}
        </li>
      {/each}
    </ol>
    <p class="legend muted"><span><i class="k-on"></i>{t.withAudio}</span><span><i class="k-off"></i>{t.notRecorded}</span></p>
  </div>
</main>

<style>
  .head { position: relative; z-index: 1; text-align: center; color: #FFFAF4; text-shadow: 0 2px 14px rgba(120, 45, 45, .45); }
  .testament { margin: 0; font-size: 12px; letter-spacing: .3em; text-transform: uppercase; }
  .title { margin: 0; font-size: clamp(56px, 18vw, 80px); line-height: 1.15; color: #FFFAF4; }
  .section { margin-top: 30px; }
  .chips { display: flex; gap: 10px; }
  .chip { flex: 1; text-align: center; padding: 12px; border-radius: 14px; font-size: 16px; }
  .chip.on { background: var(--card); box-shadow: var(--shadow); color: var(--rose); }
  .chip.off { border: 1.5px dashed rgba(67, 48, 44, .22); color: rgba(67, 48, 44, .4); }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 9px; }
  .grid a, .grid span { aspect-ratio: 1; border-radius: 12px; display: grid; place-items: center; font-size: 18px; }
  .grid .on { background: var(--rose); color: #fff; box-shadow: 0 4px 10px rgba(169, 70, 78, .35); }
  .grid .off { border: 1.5px dashed rgba(67, 48, 44, .2); color: rgba(67, 48, 44, .38); }
  .legend { display: flex; gap: 16px; font-size: 12px; margin-top: 14px; }
  .legend i { width: 12px; height: 12px; border-radius: 4px; display: inline-block; vertical-align: -1px; margin-right: 6px; }
  .k-on { background: var(--rose); } .k-off { border: 1.5px dashed rgba(67, 48, 44, .35); }
</style>
