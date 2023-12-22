<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string
  export let type: 'center' | 'normal' | 'settings' = 'normal'

  let prevTitle = document.title

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<main
  class="page"
  class:is-center={type === 'center'}
  class:is-settings={type === 'settings'}
>
  <slot />
</main>

<style>
  .page {
    box-sizing: border-box;
    min-height: 100%;
    padding: var(--padding-m) 0;

    &.is-settings {
      display: flex;
      flex-direction: column;
      gap: var(--padding-l);
      max-width: 500px;
      margin: 0 auto;
    }

    &.is-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0 auto;
    }
  }
</style>
