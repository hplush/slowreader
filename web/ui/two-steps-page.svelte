<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string

  let prevTitle = document.title

  let stepOneElement: HTMLDivElement

  function loadNextFastHandler() {
    stepOneElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    window.addEventListener('loadNextFast', loadNextFastHandler)
    return () => {
      document.title = prevTitle
      window.removeEventListener('loadNextFast', loadNextFastHandler)
    }
  })
</script>

<main id="page" class="two-steps-page">
  <div bind:this={stepOneElement} class="two-steps-page_step">
    <slot name="one" />
  </div>
  <div class="two-steps-page_step">
    <slot name="two" />
  </div>
</main>

<style>
  .two-steps-page {
    box-sizing: border-box;
    display: flex;
    gap: var(--padding-l);
    justify-content: space-around;
    width: calc(100% - var(--padding-l));
  }

  .two-steps-page_step {
    box-sizing: border-box;
    width: 50%;
    max-width: 600px;
    height: 100vh;
    padding: var(--padding-l);
    overflow-x: auto;
  }
</style>
