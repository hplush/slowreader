<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    bottomOnMobile,
    center,
    children,
    title
  }: {
    bottomOnMobile?: boolean
    center?: boolean
    children: Snippet
    title: string
  } = $props()
</script>

<Page
  class={{
    'is-center': center,
    'is-no-bottom': bottomOnMobile === false,
    'thin-page': true
  }}
  {title}
>
  <div class="thin-page_center">
    {@render children()}
  </div>
</Page>

<style>
  :global {
    .thin-page {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100svh;

      &.is-center {
        align-items: center;
      }

      @media (width <= 41rem) {
        &:not(.is-no-bottom) {
          align-items: flex-end;
        }
      }
    }

    .thin-page_center {
      width: var(--thin-content-width);
      max-width: 100%;
      margin: 1rem 0 2rem;

      @media (width <= 64rem) {
        margin-bottom: var(--navbar-height);
      }
    }
  }
</style>
