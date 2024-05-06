<script lang="ts">
  import { secondStep, toggleSteps } from '@slowreader/core'
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

  function toggleStepsOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && document.activeElement?.tagName === 'BODY') {
      toggleSteps()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', toggleStepsOnEscape)
    document.title = title + ' › ' + prevTitle
    return () => {
      window.removeEventListener('keydown', toggleStepsOnEscape)
      document.title = prevTitle
    }
  })
</script>

<main id="page" class="two-steps-page">
  <div
    bind:this={first}
    class={`two-steps-page_step ${$secondStep ? 'is-hidden' : ''}`}
  >
    <slot name="one" />
  </div>
  <div
    bind:this={second}
    class={`two-steps-page_step ${!$secondStep ? 'is-hidden' : ''}`}
  >
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

    @media (width <= 1024px) {
      margin: 0 auto;
    }
  }

  .two-steps-page_step {
    box-sizing: border-box;
    width: 50%;
    max-width: 600px;
    height: 100vh;
    padding: var(--padding-m) var(--padding-l);
    overflow-x: auto;

    @media (width <= 1024px) {
      width: 100%;
      padding-bottom: var(--navbar-height);
    }
  }

  .two-steps-page_step.is-hidden {
    @media (width <= 1024px) {
      display: none;
    }
  }
</style>
