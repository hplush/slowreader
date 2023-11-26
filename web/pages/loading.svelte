<script lang="ts">
  import UiLoader from '../ui/loader.svelte'
</script>

<div class="loading">
  <UiLoader zoneId="main" />
</div>

<style>
  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
