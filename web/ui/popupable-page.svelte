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
      width: var(--popup-size);
      padding: var(--navbar-padding) var(--page-padding) 1rem
        var(--page-padding);
    }

    .popupable-page_center {
      max-width: var(--max-content-width);
      min-height: 100%;
      margin: 0 auto;
    }
  }
</style>
