<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    children,
    padding,
    title
  }: { children: Snippet; padding?: boolean; title: string | string[] } =
    $props()
</script>

<Page
  class={{
    'is-padding': padding,
    'popupable-page': true
  }}
  {title}
>
  <div class="popupable-page_center">
    {@render children()}
  </div>
</Page>

<style>
  :global {
    .popupable-page {
      box-sizing: border-box;
      width: calc(100vw - var(--popup-size) - var(--navbar-width));
      padding: var(--navbar-padding) var(--page-padding) 1rem
        var(--page-padding);

      &.is-padding {
        padding-top: 0.725rem;
      }

      @media (--mobile) {
        width: auto;
      }
    }

    .popupable-page_center {
      max-width: var(--max-content-width);
      min-height: 100%;
      margin: 0 auto;
    }
  }
</style>
