<script>
  import { base } from '$app/paths';
  import { t } from '$lib/strings.js';
  import { sharePage } from '$lib/share.js';
  import { toast } from '$lib/toast.svelte.js';
  import Seo from '$lib/components/Seo.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import ReadingRow from '$lib/components/ReadingRow.svelte';

  let { data } = $props();
  const n = $derived(data.narrator);
  const minutes = $derived(Math.max(1, Math.round(n.totalSec / 60)));
  async function share() {
    if ((await sharePage({ title: `${n.name} · ${t.appName}`, text: `Leituras de ${n.name}` })) === 'copied') toast.show(t.shareCopied);
  }
</script>

<Seo title={n.name} description="{t.readings(n.readings.length)} de {n.name} no {t.appName}." />

<main class="page">
  <div class="wash" style="height:190px"><img src="{base}/art/header-plain.svg" alt="" /></div>
  <nav class="topbar">
    <a class="icon-btn" href="{base}/" aria-label={t.back}><Icon name="back" size={20} /></a>
    <button class="icon-btn" onclick={share} aria-label={t.share}><Icon name="share" size={20} /></button>
  </nav>
  <header class="head">
    <div class="avatar" aria-hidden="true"><img src="{base}/art/avatar-{n.avatar}.svg" alt="" /><span>{n.name.charAt(0)}</span></div>
    <h1 class="serif name">{n.name}</h1>
    <p class="muted meta">{t.readings(n.readings.length)} · {t.minutes(minutes)}</p>
  </header>
  <div class="section">
    <p class="label">{t.readings(n.readings.length).replace(/^\d+ /, '')}</p>
    {#each n.readings as r (r.id)}<ReadingRow reading={r} subtitle={t.testaments[r.testament]} />{/each}
  </div>
</main>

<style>
  .head { position: relative; z-index: 1; text-align: center; margin-top: 4px; }
  .avatar { width: 108px; height: 108px; border-radius: 50%; margin: 0 auto; display: grid; place-items: center; overflow: hidden; position: relative; box-shadow: 0 10px 24px rgba(120, 60, 50, .3), 0 0 0 4px rgba(255, 250, 244, .85); }
  .avatar img { position: absolute; inset: 0; width: 100%; height: 100%; }
  .avatar span { position: relative; font-family: Dafoe, cursive; font-size: 58px; color: #FFFAF4; text-shadow: 0 2px 10px rgba(120, 45, 45, .5); }
  .name { font-weight: 500; font-size: 30px; margin: 14px 0 0; }
  .meta { font-size: 13px; margin: 4px 0 0; letter-spacing: .05em; }
</style>
