<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    align = 'start',
    one,
    title,
    two
  }: {
    align?: 'center' | 'start'
    one: Snippet
    title: string | string[]
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

<Page
  class={{
    'is-center': align === 'center',
    'two-options-page': true
  }}
  {title}
>
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
      justify-content: center;
      min-height: 100svh;

      @media (--no-desktop) {
        min-height: calc(100svh - var(--navbart-height));
      }

      &.is-center {
        align-items: center;

        @media (--mobile) {
          align-items: flex-end;
        }
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
      margin: var(--navbar-padding) 0 1rem 0;

      @media (--mobile) {
        margin: 0;

        &:first-child {
          margin-bottom: 2rem;
        }
      }
    }
  }
</style>
