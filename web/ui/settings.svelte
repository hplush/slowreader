<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string

  let prevTitle = document.title

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<main class="settings">
  <slot />
</main>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: var(--padding-l);
    max-width: 500px;
    margin: var(--padding-m) auto;
  }
</style>
