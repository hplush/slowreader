<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string

  let prevTitle = document.title

  let stepFirstElement: HTMLDivElement
  let stepSecondElement: HTMLDivElement

  function scrollToTop(element: HTMLDivElement) {
    if (element instanceof HTMLElement) {
      element.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  export function scrollFirstToTop() {
    scrollToTop(stepFirstElement)
  }

  export function scrollSecondToTop() {
    scrollToTop(stepSecondElement)
  }

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<main id="page" class="two-steps-page">
  <div bind:this={stepFirstElement} class="two-steps-page_step">
    <slot name="one" />
  </div>
  <div bind:this={stepSecondElement} class="two-steps-page_step">
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
