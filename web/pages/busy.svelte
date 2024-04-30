<script lang="ts">
  import Loader from '../ui/loader.svelte'
</script>

<div class="busy">
  <Loader zoneId="main" />
</div>

<style>
  .busy {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
