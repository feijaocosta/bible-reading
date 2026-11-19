<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { player } from '$lib/player.svelte.js';
  import { toast } from '$lib/toast.svelte.js';
  import { initAnalytics, trackPageView, track } from '$lib/analytics.js';
  import MiniPlayer from '$lib/components/MiniPlayer.svelte';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import Footer from '$lib/components/Footer.svelte';
  let { children, data } = $props();
  let audio;

  onMount(() => {
    player.attach(audio);
    initAnalytics(data.gaId);
    window.addEventListener('appinstalled', () => track('app_installed'));
  });
  // One page_view per navigation (initial load included).
  afterNavigate(() => trackPageView(location.href, document.title));
</script>

<audio bind:this={audio} preload="metadata"></audio>
<div style="--player-h:{player.current ? '86px' : '0px'}">
  {@render children()}
  <Footer />
</div>
<MiniPlayer />
<UpdateBanner />
{#if toast.message}<div class="toast" role="status">{toast.message}</div>{/if}
