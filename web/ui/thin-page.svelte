<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    bottomOnMobile,
    children,
    title
  }: {
    bottomOnMobile?: boolean
    children: Snippet
    title: string
  } = $props()
</script>

<Page
  class={{ 'is-no-bottom': bottomOnMobile === false, 'thin-page': true }}
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
      align-items: center;
      justify-content: center;
      min-height: 100svh;

      @media (width <= 41rem) {
        &:not(.is-no-bottom) {
          align-items: flex-end;
        }
      }
    }

    .thin-page_center {
      width: 19rem;
      max-width: 100%;
      margin: 1rem 0 2rem;
    }
  }
</style>
