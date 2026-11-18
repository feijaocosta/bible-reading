<script>
  // Simple line icons (no icon font, no external requests).
  let { name, size = 22, color = 'currentColor' } = $props();
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/>',
    back15: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
    fwd15: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  };
  const filled = {
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/>',
  };
</script>

{#if filled[name]}
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">{@html filled[name]}</svg>
{:else}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html paths[name]}</svg>
{/if}
