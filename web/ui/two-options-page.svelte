<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    one,
    title,
    two
  }: {
    one: Snippet
    title: string
    two: Snippet
  } = $props()

  let first: HTMLDivElement | undefined
  let center: HTMLDivElement | undefined

  $effect(() => {
    if (first && center) {
      center.style.setProperty(
        '--two-options-page-height',
        `${first.offsetHeight}px`
      )
    }
  })
</script>

<Page class="two-options-page" {title}>
  <div bind:this={center} class="two-options-page_center">
    <div bind:this={first} class="two-options-page_option">
      {@render one()}
    </div>
    <div class="two-options-page_option">
      {@render two()}
    </div>
  </div>
</Page>

<style>
  :global {
    .two-options-page {
      display: flex;
      flex-grow: 1;
      align-items: center;
      justify-content: center;
      min-height: 100svh;

      @media (--mobile) {
        align-items: flex-end;
      }
    }

    .two-options-page_center {
      box-sizing: border-box;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      justify-content: center;
      height: var(--two-options-page-height, auto);

      @media (--mobile) {
        flex-direction: column-reverse;
        gap: 0.5rem;
        height: auto;
      }
    }

    .two-options-page_option {
      width: 20rem;
      max-width: 100%;
      margin: 0.5rem 0;

      @media (--mobile) {
        margin: 0;

        &:first-child {
          margin-bottom: 2rem;
        }
      }
    }
  }
</style>
