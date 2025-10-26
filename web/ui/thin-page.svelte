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
    title: string | string[]
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
      flex-grow: 1;
      align-items: flex-start;
      justify-content: center;
      min-height: 100%;
      padding-inline: var(--page-padding);

      &.is-center {
        align-items: center;
      }

      @media (--mobile) {
        &:not(.is-no-bottom) {
          align-items: flex-end;
        }
      }
    }

    .thin-page_center {
      width: var(--thin-content-width);
      max-width: 100%;
      margin: 1rem 0 2rem;
    }
  }
</style>
