<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string
  export let type: 'center' | 'list' | 'normal' = 'normal'

  let prevTitle = document.title

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<main
  id="page"
  class="page"
  class:is-center={type === 'center'}
  class:is-list={type === 'list'}
>
  <slot />
</main>

<style>
  .page {
    box-sizing: border-box;
    min-height: 100%;
    padding: var(--padding-m) var(--padding-l);

    @media (width <= 1024px) {
      padding-bottom: var(--navbar-height);
    }

    &.is-list {
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
