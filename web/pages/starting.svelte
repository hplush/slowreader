<script lang="ts">
  import UiLoader from '../ui/loader.svelte'
</script>

<div class="starting">
  <UiLoader zoneId="main" />
</div>

<style>
  .starting {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
