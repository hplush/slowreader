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
      display: flex;
      width: calc(100vw - var(--popup-size) - var(--navbar-width));
      min-height: 100svh;
      padding: var(--navbar-padding) var(--page-padding) 1rem
        var(--page-padding);

      &.is-padding {
        padding-top: 0.725rem;
      }

      @media (--no-desktop) {
        min-height: calc(
          100svh - var(--navbar-height) - env(safe-area-inset-top)
        );
      }

      @media (--mobile) {
        width: auto;
      }
    }

    .popupable-page_center {
      display: flex;
      width: stretch;
      max-width: var(--max-content-width);
      margin: 0 auto;

      @media (--mobile) {
        max-width: none;
      }
    }
  }
</style>
