<script>
  // Page title and link-preview tags (WhatsApp, Telegram, etc. read the Open Graph tags).
  import { page } from '$app/state';
  import { t } from '$lib/strings.js';
  // canonical: path (without the base) of the preferred URL when this page duplicates another one.
  // noindex: keep the page out of search results (e.g. per-device screens).
  let { title, description = t.tagline, image, canonical, noindex = false } = $props();
  const site = $derived(page.data.siteUrl);
  // siteUrl already includes the base path; the page path does too, so join on the origin.
  const url = $derived(site ? (canonical ? site + canonical : new URL(site).origin + page.url.pathname) : '');
  const fullTitle = $derived(title ? `${title} · ${t.appName}` : t.appName);
  const img = $derived(image || (site ? `${site}/icons/icon-512.png` : ''));
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  {#if noindex}<meta name="robots" content="noindex" />{/if}
  <meta property="og:site_name" content={t.appName} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:title" content={title || t.appName} />
  <meta property="og:description" content={description} />
  {#if url}<meta property="og:url" content={url} /><link rel="canonical" href={url} />{/if}
  {#if img}<meta property="og:image" content={img} /><meta name="twitter:card" content="summary_large_image" />{/if}
</svelte:head>
