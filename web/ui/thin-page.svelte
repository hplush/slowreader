<script lang="ts">
  import type { Snippet } from 'svelte'

  import Page from './page.svelte'

  let {
    center,
    children,
    title
  }: {
    center?: boolean
    children: Snippet
    title: string
  } = $props()
</script>

<Page {title}>
  <div class="thin-page" class:is-center={center}>
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
        &:not(.is-center) {
          align-items: flex-end;
        }
      }
    }

    .thin-page_center {
      width: 300px;
      max-width: 100%;
      margin: 16px 0;
    }
  }
</style>
