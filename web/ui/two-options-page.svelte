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
</script>

<Page
  class={{
    'is-center': align === 'center',
    'two-options-page': true
  }}
  {title}
>
  <div
    class="two-options-page_center"
    {@attach center => {
      let first = center.children[0]
      if (first instanceof HTMLElement) {
        center.style.setProperty(
          '--two-options-page-height',
          `${first.offsetHeight}px`
        )
      }
    }}
  >
    <div class="two-options-page_option">
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
      flex-grow: 0;
      justify-content: center;
      min-height: 100svh;

      @media (--no-desktop) {
        min-height: calc(100svh - var(--navbar-height));
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
        flex-shrink: 1;
      }
    }

    .two-options-page_option {
      margin: var(--navbar-padding) 0 1rem 0;

      @media (--no-mobile) {
        width: 20rem;
        max-width: 100%;
      }

      @media (--mobile) {
        width: auto;
        margin: 0;
        padding-inline: var(--page-padding);

        &:first-child {
          margin-bottom: 2rem;
        }
      }
    }
  }
</style>
