<script lang="ts">
  import { mdiChevronLeft, mdiClose } from '@mdi/js'
  import { isMobile, router, commonMessages as t } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import { getHashWithoutLastPopup } from '../stores/url-router.ts'
  import Button from './button.svelte'

  let {
    children,
    header,
    id
  }: { children: Snippet; header?: Snippet; id: string } = $props()
</script>

<aside {id} class="popup">
  <header class="popup_header">
    {#if header}
      {@render header()}
    {/if}
    <Button
      href={getHashWithoutLastPopup($router)}
      icon={$isMobile ? mdiChevronLeft : mdiClose}
      size="icon"
      tabindex={-1}
      variant="plain"
    >
      {$t.closePopup}
    </Button>
  </header>
  <div class="popup_body">
    <div class="popup_content">
      {@render children()}
    </div>
  </div>
</aside>

<style>
  :global {
    .popup {
      position: fixed;
      display: flex;
      flex-direction: column;
      width: var(--popup-size);

      @media (--no-mobile) {
        @mixin background var(--main-land-color);

        inset-block: 0;
        inset-inline-end: 0;
        box-shadow: var(--popup-shadow);
      }

      @media (--mobile) {
        inset: 0;
        z-index: 20;
        flex-direction: column-reverse;
        background: var(--land-color);
      }
    }

    .popup_header {
      box-sizing: border-box;
      display: flex;
      flex-direction: row-reverse;
      gap: 0.5rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem var(--page-padding);

      @media (--mobile) {
        height: var(--navbar-height);
        padding: 0 var(--navbar-padding);
        box-shadow: var(--bottom-panel-shadow);

        @mixin background var(--main-land-color);
      }
    }

    .popup_body {
      box-sizing: border-box;
      height: calc(100% - var(--navbar-height));
      overflow: hidden scroll;

      @media (--mobile) {
        padding: var(--page-padding);
      }
    }

    .popup_content {
      padding: var(--page-padding);
    }
  }
</style>
