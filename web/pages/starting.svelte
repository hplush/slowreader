<script lang="ts">
  import Loader from '../ui/loader.svelte'
</script>

<div class="starting">
  <Loader zoneId="main" />
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
