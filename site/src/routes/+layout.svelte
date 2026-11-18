<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { player } from '$lib/player.svelte.js';
  import { toast } from '$lib/toast.svelte.js';
  import MiniPlayer from '$lib/components/MiniPlayer.svelte';
  let { children } = $props();
  let audio;
  onMount(() => player.attach(audio));
</script>

<audio bind:this={audio} preload="metadata"></audio>
<div style="--player-h:{player.current ? '86px' : '0px'}">
  {@render children()}
</div>
<MiniPlayer />
{#if toast.message}<div class="toast" role="status">{toast.message}</div>{/if}
