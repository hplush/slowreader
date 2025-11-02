<script lang="ts">
  let { text }: { text: string } = $props()
</script>

<div class="sr-only" aria-live="polite" role="status">
  {text}
</div>
