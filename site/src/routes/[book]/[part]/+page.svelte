<script>
  import ReadingView from '$lib/components/ReadingView.svelte';
  let { data } = $props();
</script>

{#key data.reading.id}<ReadingView {data} />{/key}
