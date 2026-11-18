<script>
  // The reading artwork (16:9). Falls back to a soft wash while loading or if it fails.
  let { reading, eager = false, class: cls = '' } = $props();
  let failed = $state(false);
</script>

<div class="cover {cls}">
  {#if reading?.coverUrl && !failed}
    <img src={reading.coverUrl} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onerror={() => (failed = true)} />
  {:else}
    <span class="fallback script">{reading?.book}</span>
  {/if}
</div>

<style>
  .cover { aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: linear-gradient(120deg, #E7B3A6, #F3DDC0 60%, #C9D3BE); display: grid; place-items: center; }
  img { width: 100%; height: 100%; object-fit: cover; }
  .fallback { font-size: 28px; color: #fff; text-shadow: 0 2px 8px rgba(120, 45, 45, .4); }
</style>
