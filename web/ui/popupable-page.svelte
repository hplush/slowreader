<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let { children, title }: { children: Snippet; title: string } = $props()
</script>

<Page
  class={{
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
      flex-grow: 1;
      padding: var(--navbar-padding) var(--page-padding) 1rem
        var(--page-padding);

      @media (--no-mobile) {
        flex-grow: 0;
        width: 50%;
      }
    }

    .popupable-page_center {
      max-width: var(--max-content-width);
      margin: 0 auto;
    }
  }
</style>
