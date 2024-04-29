<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string

  let prevTitle = document.title

  let first: HTMLDivElement
  let second: HTMLDivElement

  export function scrollFirstToTop(): void {
    first.scrollTo({
      behavior: 'smooth',
      top: 0
    })
  }

  export function scrollSecondToTop(): void {
    second.scrollTo({
      behavior: 'smooth',
      top: 0
    })
  }

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<main id="page" class="two-steps-page">
  <div bind:this={first} class="two-steps-page_step">
    <slot name="one" />
  </div>
  <div bind:this={second} class="two-steps-page_step">
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
    padding: var(--padding-m) var(--padding-l);
    overflow-x: auto;

    @media (width <= 1024px) {
      padding-inline-start: var(--navbar-height);
    }
  }
</style>
