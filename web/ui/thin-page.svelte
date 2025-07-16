<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    children,
    title
  }: {
    children: Snippet
    title: string
  } = $props()
</script>

<Page {title}>
  <div class="thin-page">
    <div class="thin-page_center">{@render children()}</div>
  </div>
</Page>

<style>
  :global {
    .thin-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100svh;

      @media (width <= 630px) {
        align-items: flex-end;
      }
    }

    .thin-page_center {
      width: 310px;
      margin: 8px 0;
    }
  }
</style>
